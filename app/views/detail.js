// Issue Detail view implementation (lit-html based)
import { html, render } from 'lit-html';
import { issueDisplayId } from '../utils/issue-id.js';
import { renderMarkdown } from '../utils/markdown.js';
import { priority_levels } from '../utils/priority.js';
import { statusLabel } from '../utils/status.js';
import { createTypeBadge } from '../utils/type-badge.js';

/**
 * @typedef {Object} Dependency
 * @property {string} id
 * @property {string} [title]
 * @property {string} [status]
 * @property {number} [priority]
 * @property {string} [issue_type]
 */

/**
 * @typedef {Object} IssueDetail
 * @property {string} id
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [acceptance]
 * @property {string} [status]
 * @property {number} [priority]
 * @property {Dependency[]} [dependencies]
 * @property {Dependency[]} [dependents]
 */

/**
 * Create the Issue Detail view.
 * @param {HTMLElement} mount_element - Element to render into.
 * @param {(type: string, payload?: unknown) => Promise<unknown>} sendFn - RPC transport.
 * @param {(hash: string) => void} [navigateFn] - Navigation function; defaults to setting location.hash.
 * @returns {{ load: (id: string) => Promise<void>, clear: () => void, destroy: () => void }} View API.
 */
export function createDetailView(mount_element, sendFn, navigateFn) {
  /** @type {IssueDetail | null} */
  let current = null;
  /** @type {boolean} */
  let pending = false;
  /** @type {boolean} */
  let edit_title = false;
  /** @type {boolean} */
  let edit_desc = false;
  /** @type {boolean} */
  let edit_accept = false;

  /**
   * Show a transient toast message.
   * @param {string} text
   */
  function showToast(text) {
    /** @type {HTMLDivElement} */
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    toast.style.position = 'absolute';
    toast.style.right = '12px';
    toast.style.bottom = '12px';
    toast.style.background = 'rgba(0,0,0,0.8)';
    toast.style.color = '#fff';
    toast.style.padding = '8px 10px';
    toast.style.borderRadius = '4px';
    toast.style.fontSize = '12px';
    mount_element.appendChild(toast);
    setTimeout(() => {
      try {
        toast.remove();
      } catch {
        /* ignore */
      }
    }, 2800);
  }

  /** @param {string} id */
  function issueHref(id) {
    return `#/issue/${id}`;
  }

  /**
   * @param {string} message
   */
  function renderPlaceholder(message) {
    render(
      html`
        <div class="panel__header"><span class="mono">—</span></div>
        <div class="panel__body" id="detail-root">
          <p class="muted">${message}</p>
        </div>
      `,
      mount_element
    );
  }

  // Handlers
  const onTitleSpanClick = () => {
    edit_title = true;
    doRender();
  };
  /**
   * @param {KeyboardEvent} ev
   */
  const onTitleKeydown = (ev) => {
    if (ev.key === 'Enter') {
      edit_title = true;
      doRender();
    } else if (ev.key === 'Escape') {
      edit_title = false;
      doRender();
    }
  };
  const onTitleSave = async () => {
    if (!current || pending) {
      return;
    }
    /** @type {HTMLInputElement|null} */
    const input = /** @type {any} */ (mount_element.querySelector('h2 input'));
    const prev = current.title || '';
    const next = input ? input.value : '';
    if (next === prev) {
      edit_title = false;
      doRender();
      return;
    }
    pending = true;
    if (input) {
      input.disabled = true;
    }
    try {
      /** @type {any} */
      const updated = await sendFn('edit-text', {
        id: current.id,
        field: 'title',
        value: next
      });
      if (updated && typeof updated === 'object') {
        current = /** @type {IssueDetail} */ (updated);
        edit_title = false;
        doRender();
      }
    } catch {
      current.title = prev;
      edit_title = false;
      doRender();
      showToast('Failed to save title');
    } finally {
      pending = false;
    }
  };
  const onTitleCancel = () => {
    edit_title = false;
    doRender();
  };
  /**
   * @param {Event} ev
   */
  const onStatusChange = async (ev) => {
    if (!current || pending) {
      doRender();
      return;
    }
    /** @type {HTMLSelectElement} */
    const sel = /** @type {any} */ (ev.currentTarget);
    const prev = current.status || 'open';
    const next = sel.value;
    if (next === prev) {
      return;
    }
    pending = true;
    current.status = next;
    doRender();
    try {
      /** @type {any} */
      const updated = await sendFn('update-status', {
        id: current.id,
        status: next
      });
      if (updated && typeof updated === 'object') {
        current = /** @type {IssueDetail} */ (updated);
        doRender();
      }
    } catch {
      current.status = prev;
      doRender();
      showToast('Failed to update status');
    } finally {
      pending = false;
    }
  };
  /**
   * @param {Event} ev
   */
  const onPriorityChange = async (ev) => {
    if (!current || pending) {
      doRender();
      return;
    }
    /** @type {HTMLSelectElement} */
    const sel = /** @type {any} */ (ev.currentTarget);
    const prev = typeof current.priority === 'number' ? current.priority : 2;
    const next = Number(sel.value);
    if (next === prev) {
      return;
    }
    pending = true;
    current.priority = next;
    doRender();
    try {
      const updated = await sendFn('update-priority', {
        id: current.id,
        priority: next
      });
      if (updated && typeof updated === 'object') {
        current = /** @type {IssueDetail} */ (updated);
        doRender();
      }
    } catch {
      current.priority = prev;
      doRender();
      showToast('Failed to update priority');
    } finally {
      pending = false;
    }
  };

  const onDescEdit = () => {
    edit_desc = true;
    doRender();
  };
  /**
   * @param {KeyboardEvent} ev
   */
  const onDescKeydown = (ev) => {
    if (ev.key === 'Escape') {
      edit_desc = false;
      doRender();
    } else if (
      ev.key === 'Enter' &&
      /** @type {KeyboardEvent} */ (ev).ctrlKey
    ) {
      const btn = /** @type {HTMLButtonElement|null} */ (
        mount_element.querySelector('#detail-root .editable-actions button')
      );
      if (btn) {
        btn.click();
      }
    }
  };
  const onDescSave = async () => {
    if (!current || pending) {
      return;
    }
    /** @type {HTMLTextAreaElement|null} */
    const ta = /** @type {any} */ (
      mount_element.querySelector('#detail-root textarea')
    );
    const prev = current.description || '';
    const next = ta ? ta.value : '';
    if (next === prev) {
      edit_desc = false;
      doRender();
      return;
    }
    pending = true;
    if (ta) {
      ta.disabled = true;
    }
    try {
      /** @type {any} */
      const updated = await sendFn('edit-text', {
        id: current.id,
        field: 'description',
        value: next
      });
      if (updated && typeof updated === 'object') {
        current = /** @type {IssueDetail} */ (updated);
        edit_desc = false;
        doRender();
      }
    } catch {
      current.description = prev;
      edit_desc = false;
      doRender();
      showToast('Failed to save description');
    } finally {
      pending = false;
    }
  };
  const onDescCancel = () => {
    edit_desc = false;
    doRender();
  };

  const onAcceptEdit = () => {
    edit_accept = true;
    doRender();
  };
  /**
   * @param {KeyboardEvent} ev
   */
  const onAcceptKeydown = (ev) => {
    if (ev.key === 'Escape') {
      edit_accept = false;
      doRender();
    } else if (
      ev.key === 'Enter' &&
      /** @type {KeyboardEvent} */ (ev).ctrlKey
    ) {
      const btn = /** @type {HTMLButtonElement|null} */ (
        mount_element.querySelector(
          '#detail-root .acceptance .editable-actions button'
        )
      );
      if (btn) {
        btn.click();
      }
    }
  };
  const onAcceptSave = async () => {
    if (!current || pending) {
      return;
    }
    /** @type {HTMLTextAreaElement|null} */
    const ta = /** @type {any} */ (
      mount_element.querySelector('#detail-root .acceptance textarea')
    );
    const prev = current.acceptance || '';
    const next = ta ? ta.value : '';
    if (next === prev) {
      edit_accept = false;
      doRender();
      return;
    }
    pending = true;
    if (ta) {
      ta.disabled = true;
    }
    try {
      /** @type {any} */
      const updated = await sendFn('edit-text', {
        id: current.id,
        field: 'acceptance',
        value: next
      });
      if (updated && typeof updated === 'object') {
        current = /** @type {IssueDetail} */ (updated);
        edit_accept = false;
        doRender();
      }
    } catch {
      current.acceptance = prev;
      edit_accept = false;
      doRender();
      showToast('Failed to save acceptance');
    } finally {
      pending = false;
    }
  };
  const onAcceptCancel = () => {
    edit_accept = false;
    doRender();
  };

  /**
   * @param {'Dependencies'|'Dependents'} title
   * @param {Dependency[]} items
   */
  function depsSection(title, items) {
    const test_id =
      title === 'Dependencies' ? 'add-dependency' : 'add-dependent';
    return html`
      <div class="props-card">
        <div
          style="display:flex;align-items:center;justify-content:space-between;"
        >
          <div class="props-card__title">${title}</div>
        </div>
        <ul>
          ${!items || items.length === 0
            ? html`<li class="muted">(none)</li>`
            : items.map((dep) => {
                const did = dep.id;
                const href = issueHref(did);
                return html` <li
                  style="display:grid;grid-template-columns:auto auto 1fr auto;gap:6px;align-items:center;padding:2px 0;cursor:pointer;"
                  @click=${() => {
                    const nav =
                      navigateFn || ((h) => (window.location.hash = h));
                    nav(href);
                  }}
                >
                  <a href=${href} @click=${makeDepLinkClick(href)}
                    >${issueDisplayId(did)}</a
                  >
                  ${createTypeBadge(dep.issue_type || '')}
                  <span class="text-truncate">${dep.title || ''}</span>
                  <button
                    aria-label=${`Remove dependency ${issueDisplayId(did)}`}
                    @click=${makeDepRemoveClick(did, title)}
                  >
                    ×
                  </button>
                </li>`;
              })}
        </ul>
        <div>
          <input type="text" placeholder="Issue ID" data-testid=${test_id} />
          <button @click=${makeDepAddClick(items, title)}>Add</button>
        </div>
      </div>
    `;
  }

  /**
   * @param {IssueDetail} issue
   */
  function detailTemplate(issue) {
    const title_zone = edit_title
      ? html`<h2 style="margin:0 0 8px">
          <input
            type="text"
            aria-label="Edit title"
            .value=${issue.title || ''}
            size=${Math.min(80, Math.max(20, (issue.title || '').length + 5))}
            @keydown=${onTitleInputKeydown}
          />
          <button style="margin-left:6px" @click=${onTitleSave}>Save</button>
          <button style="margin-left:6px" @click=${onTitleCancel}>
            Cancel
          </button>
        </h2>`
      : html`<h2 style="margin:0 0 8px">
          <span
            class="editable"
            tabindex="0"
            role="button"
            aria-label="Edit title"
            @click=${onTitleSpanClick}
            @keydown=${onTitleKeydown}
            >${issue.title || ''}</span
          >
        </h2>`;

    const status_select = html`<select
      @change=${onStatusChange}
      .value=${issue.status || 'open'}
      ?disabled=${pending}
    >
      ${['open', 'in_progress', 'closed'].map(
        (s) => html`<option value=${s}>${statusLabel(s)}</option>`
      )}
    </select>`;

    const priority_select = html`<select
      @change=${onPriorityChange}
      .value=${String(typeof issue.priority === 'number' ? issue.priority : 2)}
      ?disabled=${pending}
    >
      ${priority_levels.map(
        (p, i) => html`<option value=${String(i)}>${p}</option>`
      )}
    </select>`;

    const desc_block = edit_desc
      ? html`<div class="description">
          <textarea
            @keydown=${onDescKeydown}
            .value=${issue.description || ''}
            rows="8"
            style="width:100%"
          ></textarea>
          <div class="editable-actions">
            <button @click=${onDescSave}>Save</button>
            <button @click=${onDescCancel}>Cancel</button>
          </div>
        </div>`
      : html`<div
          class="md editable"
          tabindex="0"
          role="button"
          aria-label="Edit description"
          @click=${onDescEdit}
          @keydown=${onDescEditableKeydown}
        >
          ${(() => {
            const text = issue.description || '';
            if (text.trim() === '') {
              return html`<div class="muted">Description</div>`;
            }
            return renderMarkdown(text);
          })()}
        </div>`;

    const accept_block = edit_accept
      ? html`<div class="acceptance">
          <div class="props-card__title">Acceptance</div>
          <textarea
            @keydown=${onAcceptKeydown}
            .value=${current && current.acceptance ? current.acceptance : ''}
            rows="6"
            style="width:100%"
          ></textarea>
          <div class="editable-actions">
            <button @click=${onAcceptSave}>Save</button>
            <button @click=${onAcceptCancel}>Cancel</button>
          </div>
        </div>`
      : html`<div class="acceptance">
          <div class="props-card__title">Acceptance</div>
          <div
            class="md editable"
            tabindex="0"
            role="button"
            aria-label="Edit acceptance"
            @click=${onAcceptEdit}
            @keydown=${onAcceptEditableKeydown}
          >
            ${renderMarkdown(
              current && current.acceptance ? current.acceptance : ''
            )}
          </div>
        </div>`;

    return html`
      <div class="panel__header">
        <span class="mono">${issueDisplayId(issue.id)}</span>
      </div>
      <div class="panel__body" id="detail-root">
        <div style="position:relative">
          <div class="detail-layout">
            <div class="detail-main">
              ${title_zone} ${desc_block} ${accept_block}
            </div>
            <div class="detail-side">
              <div class="props-card">
                <div class="props-card__title">Properties</div>
                <div class="prop">
                  <div class="label">Type</div>
                  <div class="value">
                    ${createTypeBadge(/** @type {any} */ (issue).issue_type)}
                  </div>
                </div>
                <div class="prop">
                  <div class="label">Status</div>
                  <div class="value">${status_select}</div>
                </div>
                <div class="prop">
                  <div class="label">Priority</div>
                  <div class="value">${priority_select}</div>
                </div>
              </div>
              ${depsSection('Dependencies', issue.dependencies || [])}
              ${depsSection('Dependents', issue.dependents || [])}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function doRender() {
    if (!current) {
      renderPlaceholder('No issue selected');
      return;
    }
    render(detailTemplate(current), mount_element);
    // Defensive: ensure header text is set for environments where a stale
    // skeleton header may be queried before lit updates propagate.
    const hdr = /** @type {HTMLElement|null} */ (
      mount_element.querySelector('.panel__header')
    );
    if (hdr && (hdr.textContent || '').trim() === '') {
      const span = document.createElement('span');
      span.className = 'mono';
      span.textContent = issueDisplayId(current.id);
      hdr.replaceChildren(span);
    }
  }

  /**
   * Create an anchor click handler for dependency links.
   * @param {string} href
   * @returns {(ev: Event) => void}
   */
  function makeDepLinkClick(href) {
    return (ev) => {
      ev.preventDefault();
      /** @type {Event} */
      const e = ev;
      // stop bubbling to the li row click
      e.stopPropagation();
      const nav = navigateFn || ((h) => (window.location.hash = h));
      nav(href);
    };
  }

  /**
   * Create a click handler for the remove button of a dependency row.
   * @param {string} did
   * @param {'Dependencies'|'Dependents'} title
   * @returns {(ev: Event) => Promise<void>}
   */
  function makeDepRemoveClick(did, title) {
    return async (ev) => {
      /** @type {Event} */
      const e = ev;
      e.stopPropagation();
      if (!current || pending) {
        return;
      }
      pending = true;
      try {
        if (title === 'Dependencies') {
          /** @type {any} */
          const updated = await sendFn('dep-remove', {
            a: current.id,
            b: did,
            view_id: current.id
          });
          if (updated && typeof updated === 'object') {
            current = /** @type {IssueDetail} */ (updated);
            doRender();
          }
        } else {
          /** @type {any} */
          const updated = await sendFn('dep-remove', {
            a: did,
            b: current.id,
            view_id: current.id
          });
          if (updated && typeof updated === 'object') {
            current = /** @type {IssueDetail} */ (updated);
            doRender();
          }
        }
      } catch {
        // ignore
      } finally {
        pending = false;
      }
    };
  }

  /**
   * Create a click handler for the Add button in a dependency section.
   * @param {Dependency[]} items
   * @param {'Dependencies'|'Dependents'} title
   * @returns {(ev: Event) => Promise<void>}
   */
  function makeDepAddClick(items, title) {
    return async (ev) => {
      if (!current || pending) {
        return;
      }
      /** @type {HTMLButtonElement} */
      const btn = /** @type {any} */ (ev.currentTarget);
      /** @type {HTMLInputElement|null} */
      const input = /** @type {any} */ (btn.previousElementSibling);
      const target = input ? input.value.trim() : '';
      if (!target || target === current.id) {
        showToast('Enter a different issue id');
        return;
      }
      const set = new Set((items || []).map((d) => d.id));
      if (set.has(target)) {
        showToast('Link already exists');
        return;
      }
      pending = true;
      if (btn) {
        btn.disabled = true;
      }
      if (input) {
        input.disabled = true;
      }
      try {
        if (title === 'Dependencies') {
          /** @type {any} */
          const updated = await sendFn('dep-add', {
            a: current.id,
            b: target,
            view_id: current.id
          });
          if (updated && typeof updated === 'object') {
            current = /** @type {IssueDetail} */ (updated);
            doRender();
          }
        } else {
          /** @type {any} */
          const updated = await sendFn('dep-add', {
            a: target,
            b: current.id,
            view_id: current.id
          });
          if (updated && typeof updated === 'object') {
            current = /** @type {IssueDetail} */ (updated);
            doRender();
          }
        }
      } catch {
        showToast('Failed to add dependency');
      } finally {
        pending = false;
      }
    };
  }
  /**
   * @param {KeyboardEvent} ev
   */
  function onTitleInputKeydown(ev) {
    if (ev.key === 'Escape') {
      edit_title = false;
      doRender();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      onTitleSave();
    }
  }

  /**
   * @param {KeyboardEvent} ev
   */
  function onDescEditableKeydown(ev) {
    if (ev.key === 'Enter') {
      onDescEdit();
    }
  }

  /**
   * @param {KeyboardEvent} ev
   */
  function onAcceptEditableKeydown(ev) {
    if (ev.key === 'Enter') {
      onAcceptEdit();
    }
  }

  return {
    async load(id) {
      if (!id) {
        renderPlaceholder('No issue selected');
        return;
      }
      /** @type {unknown} */
      let result;
      try {
        result = await sendFn('show-issue', { id });
      } catch {
        result = null;
      }
      if (!result || typeof result !== 'object') {
        renderPlaceholder('Issue not found');
        return;
      }
      const issue = /** @type {IssueDetail} */ (result);
      // Some backends may normalize ID casing (e.g., UI-1 vs ui-1).
      // Treat IDs case-insensitively to avoid false negatives on deep links.
      if (
        !issue ||
        String(issue.id || '').toLowerCase() !== String(id || '').toLowerCase()
      ) {
        renderPlaceholder('Issue not found');
        return;
      }
      current = issue;
      pending = false;
      doRender();
    },
    clear() {
      renderPlaceholder('Select an issue to view details');
    },
    destroy() {
      mount_element.replaceChildren();
    }
  };
}
