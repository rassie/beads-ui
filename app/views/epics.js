import { html, render } from 'lit-html';

/**
 * @typedef {{ id: string, title?: string, status?: string, priority?: number, issue_type?: string, assignee?: string }} IssueLite
 */

/**
 * Epics view: grouped table using `bd epic status --json`. Expanding a group loads
 * the epic via `getIssue(id)` and then loads each dependent issue to filter out
 * closed items. Provides inline editing for type, title, priority, status, assignee.
 * @param {HTMLElement} mount_element
 * @param {{ getEpicStatus: () => Promise<any[]>, getIssue: (id: string) => Promise<any>, updateIssue: (input: any) => Promise<any> }} data
 * @param {(id: string) => void} goto_issue - Navigate to issue detail.
 */
export function createEpicsView(mount_element, data, goto_issue) {
  /** @type {any[]} */
  let groups = [];
  /** @type {Set<string>} */
  const expanded = new Set();
  /** @type {Map<string, IssueLite[]>} */
  const children = new Map();

  function doRender() {
    render(template(), mount_element);
  }

  function template() {
    return html`
      <div class="panel__header">Epics</div>
      <div class="panel__body">${groups.map((g) => groupTemplate(g))}</div>
    `;
  }

  /**
   * @param {any} g
   */
  function groupTemplate(g) {
    const epic = g.epic || {};
    const id = String(epic.id || '');
    const is_open = expanded.has(id);
    const list = children.get(id) || [];
    return html`
      <div class="epic-group" data-epic-id=${id}>
        <div
          class="epic-header"
          @click=${() => toggle(id)}
          role="button"
          tabindex="0"
          aria-expanded=${is_open}
        >
          <span class="mono">${id}</span>
          <span class="text-truncate" style="margin-left:8px"
            >${epic.title || '(no title)'}</span
          >
          <span class="muted" style="margin-left:auto"
            >${g.closed_children}/${g.total_children} closed</span
          >
        </div>
        ${is_open
          ? html`<div class="epic-children">
              ${list.length === 0
                ? html`<div class="muted">No open issues</div>`
                : html`<table class="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${list.map((it) => rowTemplate(it))}
                    </tbody>
                  </table>`}
            </div>`
          : null}
      </div>
    `;
  }

  /**
   * @param {IssueLite} it
   */
  function rowTemplate(it) {
    return html`<tr class="epic-row" @click=${makeRowClick(it.id)}>
      <td class="mono">${it.id}</td>
      <td>
        <input
          type="text"
          .value=${it.title || ''}
          @change=${makeTextChange(it.id, 'title')}
        />
      </td>
      <td>
        <select
          .value=${it.issue_type || ''}
          @change=${makeSelectChange(it.id, 'type')}
        >
          ${['bug', 'feature', 'task', 'epic', 'chore'].map(
            (t) => html`<option value=${t}>${t}</option>`
          )}
        </select>
      </td>
      <td>
        <select
          .value=${String(it.priority ?? 2)}
          @change=${makeSelectChange(it.id, 'priority')}
        >
          ${[0, 1, 2, 3, 4].map(
            (p) => html`<option value=${String(p)}>${String(p)}</option>`
          )}
        </select>
      </td>
      <td>
        <select
          .value=${it.status || 'open'}
          @change=${makeSelectChange(it.id, 'status')}
        >
          ${['open', 'in_progress', 'closed'].map(
            (s) => html`<option value=${s}>${s}</option>`
          )}
        </select>
      </td>
      <td>
        <input
          type="text"
          .value=${it.assignee || ''}
          @change=${makeTextChange(it.id, 'assignee')}
        />
      </td>
    </tr>`;
  }

  /**
   * Create row click handler that avoids triggering on input/select child clicks.
   * @param {string} id
   * @returns {(ev: Event) => void}
   */
  function makeRowClick(id) {
    return (ev) => {
      /** @type {HTMLElement|null} */
      const el = /** @type {any} */ (ev.target);
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT')) {
        return;
      }
      goto_issue(id);
    };
  }

  /**
   * @param {Event} ev
   */
  function inputValue(ev) {
    /** @type {HTMLInputElement} */
    const el = /** @type {any} */ (ev.currentTarget);
    return el.value || '';
  }

  /**
   * @param {Event} ev
   */
  function selectValue(ev) {
    /** @type {HTMLSelectElement} */
    const el = /** @type {any} */ (ev.currentTarget);
    return el.value || '';
  }

  /**
   * @param {string} id
   * @param {{ [k: string]: any }} patch
   */
  async function updateInline(id, patch) {
    try {
      await data.updateIssue({ id, ...patch });
      // Opportunistic refresh for that row
      const full = await data.getIssue(id);
      /** @type {IssueLite} */
      const lite = {
        id: full.id,
        title: full.title,
        status: full.status,
        priority: full.priority,
        issue_type: full.issue_type,
        assignee: full.assignee
      };
      // Replace in children map
      for (const arr of children.values()) {
        const idx = arr.findIndex((x) => x.id === id);
        if (idx >= 0) {
          arr[idx] = lite;
        }
      }
      doRender();
    } catch {
      // swallow; UI remains
    }
  }

  /**
   * Create a change handler for text inputs.
   * @param {string} id
   * @param {'title'|'assignee'} key
   * @returns {(ev: Event) => Promise<void>}
   */
  function makeTextChange(id, key) {
    return async (ev) => {
      const val = inputValue(ev);
      /** @type {{ [k:string]: any }} */
      const patch = {};
      patch[key] = val;
      await updateInline(id, patch);
    };
  }

  /**
   * Create a change handler for select inputs.
   * @param {string} id
   * @param {'type'|'priority'|'status'} key
   * @returns {(ev: Event) => Promise<void>}
   */
  function makeSelectChange(id, key) {
    return async (ev) => {
      const val = selectValue(ev);
      /** @type {{ [k:string]: any }} */
      const patch = {};
      patch[key] = key === 'priority' ? Number(val) : val;
      await updateInline(id, patch);
    };
  }

  /**
   * @param {string} epic_id
   */
  async function toggle(epic_id) {
    if (!expanded.has(epic_id)) {
      expanded.add(epic_id);
      // Load children if not present
      if (!children.has(epic_id)) {
        doRender();
        try {
          const epic = await data.getIssue(epic_id);
          /** @type {{ id: string }[]} */
          const deps = Array.isArray(epic.dependents) ? epic.dependents : [];
          /** @type {IssueLite[]} */
          const list = [];
          for (const d of deps) {
            try {
              const full = await data.getIssue(d.id);
              if (full.status !== 'closed') {
                list.push({
                  id: full.id,
                  title: full.title,
                  status: full.status,
                  priority: full.priority,
                  issue_type: full.issue_type,
                  assignee: full.assignee
                });
              }
            } catch {
              // ignore individual failures
            }
          }
          // Sort by priority then updated_at (if present)
          list.sort((a, b) => {
            const pa = a.priority ?? 2;
            const pb = b.priority ?? 2;
            if (pa !== pb) {
              return pa - pb;
            }
            // @ts-ignore optional updated_at if present
            const ua = a.updated_at || '';
            // @ts-ignore
            const ub = b.updated_at || '';
            return ua < ub ? 1 : ua > ub ? -1 : 0;
          });
          children.set(epic_id, list);
        } finally {
          // no-op
        }
      }
    } else {
      expanded.delete(epic_id);
    }
    doRender();
  }

  return {
    async load() {
      const res = await data.getEpicStatus();
      groups = Array.isArray(res) ? res : [];
      doRender();
    }
  };
}
