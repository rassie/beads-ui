import { html, render } from 'lit-html';
import { issueDisplayId } from '../utils/issue-id.js';
import { emojiForPriority } from '../utils/priority-badge.js';
import { priority_levels } from '../utils/priority.js';
import { statusLabel } from '../utils/status.js';
import { createTypeBadge } from '../utils/type-badge.js';

/**
 * @typedef {{ id: string, title?: string, status?: string, priority?: number, issue_type?: string, assignee?: string, updated_at?: string }} IssueLite
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
  /** @type {Set<string>} */
  const loading = new Set();

  function doRender() {
    render(template(), mount_element);
  }

  function template() {
    return html`${groups.map((g) => groupTemplate(g))}`;
  }

  /**
   * @param {any} g
   */
  function groupTemplate(g) {
    const epic = g.epic || {};
    const id = String(epic.id || '');
    const is_open = expanded.has(id);
    const list = children.get(id) || [];
    const is_loading = loading.has(id);
    return html`
      <div class="epic-group" data-epic-id=${id}>
        <div
          class="epic-header"
          @click=${() => toggle(id)}
          role="button"
          tabindex="0"
          aria-expanded=${is_open}
        >
          <span class="mono">${issueDisplayId(id)}</span>
          <span class="text-truncate" style="margin-left:8px"
            >${epic.title || '(no title)'}</span
          >
          <span
            class="epic-progress"
            style="margin-left:auto; display:flex; align-items:center; gap:8px;"
          >
            <progress
              value=${Number(g.closed_children || 0)}
              max=${Math.max(1, Number(g.total_children || 0))}
            ></progress>
            <span class="muted mono"
              >${g.closed_children}/${g.total_children}</span
            >
          </span>
        </div>
        ${is_open
          ? html`<div class="epic-children">
              ${is_loading
                ? html`<div class="muted">Loading…</div>`
                : list.length === 0
                  ? html`<div class="muted">No open issues</div>`
                  : html`<table class="table">
                      <colgroup>
                        <col style="width: 100px" />
                        <col style="width: 120px" />
                        <col />
                        <col style="width: 120px" />
                        <col style="width: 160px" />
                        <col style="width: 130px" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Type</th>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Assignee</th>
                          <th>Priority</th>
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
      <td class="mono">${issueDisplayId(it.id)}</td>
      <td>${createTypeBadge(/** @type {any} */ (it).issue_type)}</td>
      <td>${editableText(it.id, 'title', it.title || '')}</td>
      <td>
        ${(() => {
          const cur = String(it.status || 'open');
          return html`<select
            class="badge-select badge--status is-${cur}"
            .value=${cur}
            @change=${makeSelectChange(it.id, 'status')}
          >
            ${['open', 'in_progress', 'closed'].map(
              (s) =>
                html`<option value=${s} ?selected=${cur === s}>
                  ${statusLabel(s)}
                </option>`
            )}
          </select>`;
        })()}
      </td>
      <td>${editableText(it.id, 'assignee', it.assignee || '')}</td>
      <td>
        ${(() => {
          const cur = String(it.priority ?? 2);
          return html`<select
            class="badge-select badge--priority ${'is-p' + cur}"
            .value=${cur}
            @change=${makeSelectChange(it.id, 'priority')}
          >
            ${priority_levels.map(
              (p, i) =>
                html`<option value=${String(i)} ?selected=${cur === String(i)}>
                  ${emojiForPriority(i)} ${p}
                </option>`
            )}
          </select>`;
        })()}
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
  // Former helper for text inputs removed; inline editing handles values directly.

  /**
   * @param {Event} ev
   */
  function selectValue(ev) {
    /** @type {HTMLSelectElement} */
    const el = /** @type {any} */ (ev.currentTarget);
    return el.value || '';
  }

  /**
   * Render editable text field using the same UX pattern as detail view:
   * shows a span with focus ring on hover, switches to input on click.
   * @param {string} id
   * @param {'title'|'assignee'} key
   * @param {string} value
   */
  function editableText(id, key, value) {
    /** @type {string} */
    const k = `${id}:${key}`;
    const is_edit = editing.has(k);
    if (is_edit) {
      return html`<span>
        <input
          type="text"
          .value=${value}
          class="inline-edit"
          @keydown=${
            /** @param {KeyboardEvent} e */ (e) => {
              if (e.key === 'Escape') {
                editing.delete(k);
                doRender();
              } else if (e.key === 'Enter') {
                // Commit
                /** @type {HTMLInputElement} */ const el = /** @type {any} */ (
                  e.currentTarget
                );
                const next = el.value || '';
                if (next !== value) {
                  void updateInline(id, { [key]: next });
                }
                editing.delete(k);
                doRender();
              }
            }
          }
          @blur=${
            /** @param {Event} ev */ (ev) => {
              /** @type {HTMLInputElement} */ const el = /** @type {any} */ (
                ev.currentTarget
              );
              const next = el.value || '';
              if (next !== value) {
                void updateInline(id, { [key]: next });
              }
              editing.delete(k);
              doRender();
            }
          }
          autofocus
        />
      </span>`;
    }
    return html`<span
      class="editable"
      tabindex="0"
      role="button"
      @click=${
        /** @param {MouseEvent} e */ (e) => {
          /** @type {Event} */ (e).stopPropagation();
          /** @type {Event} */ (e).preventDefault();
          editing.add(k);
          doRender();
        }
      }
      @keydown=${
        /** @param {KeyboardEvent} e */ (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            editing.add(k);
            doRender();
          }
        }
      }
      >${value || ''}</span
    >`;
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

  /** @type {Set<string>} */
  const editing = new Set();

  // Text inputs now use editableText pattern (see editableText)

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
        loading.add(epic_id);
        doRender();
        try {
          const epic = await data.getIssue(epic_id);
          // Children for the Epics view come from dependents: issues that list
          // the epic as a dependency. This matches how progress is tracked.
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
                  assignee: full.assignee,
                  // include updated_at for secondary sort within same priority
                  updated_at: /** @type {any} */ (full).updated_at
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
          loading.delete(epic_id);
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
      // Auto-expand first epic on screen
      try {
        if (groups.length > 0) {
          const first_id = String((groups[0].epic && groups[0].epic.id) || '');
          if (first_id && !expanded.has(first_id)) {
            // This will render and load children lazily
            await toggle(first_id);
          }
        }
      } catch {
        // ignore auto-expand failures
      }
    }
  };
}
