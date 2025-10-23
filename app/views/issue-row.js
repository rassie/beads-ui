import { html } from 'lit-html';
import { issueDisplayId } from '../utils/issue-id.js';
import { emojiForPriority } from '../utils/priority-badge.js';
import { priority_levels } from '../utils/priority.js';
import { statusLabel } from '../utils/status.js';
import { createTypeBadge } from '../utils/type-badge.js';

/**
 * @typedef {{ id: string, title?: string, status?: string, priority?: number, issue_type?: string, assignee?: string }} IssueRowData
 */

/**
 * Create a reusable issue row renderer used by list and epics views.
 * Handles inline editing for title/assignee and selects for status/priority.
 * @param {{
 *   navigate: (id: string) => void,
 *   onUpdate: (id: string, patch: { title?: string, assignee?: string, status?: 'open'|'in_progress'|'closed', priority?: number }) => Promise<void>,
 *   requestRender: () => void,
 *   getSelectedId?: () => string | null,
 *   row_class?: string
 * }} options
 * @returns {(it: IssueRowData) => import('lit-html').TemplateResult<1>}
 */
export function createIssueRowRenderer(options) {
  const navigate = options.navigate;
  const on_update = options.onUpdate;
  const request_render = options.requestRender;
  const get_selected_id = options.getSelectedId || (() => null);
  const row_class = options.row_class || 'issue-row';

  /** @type {Set<string>} */
  const editing = new Set();

  /**
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
            /** @param {KeyboardEvent} e */ async (e) => {
              if (e.key === 'Escape') {
                editing.delete(k);
                request_render();
              } else if (e.key === 'Enter') {
                /** @type {HTMLInputElement} */ const el = /** @type {any} */ (
                  e.currentTarget
                );
                const next = el.value || '';
                if (next !== value) {
                  await on_update(id, { [key]: next });
                }
                editing.delete(k);
                request_render();
              }
            }
          }
          @blur=${
            /** @param {Event} ev */ async (ev) => {
              /** @type {HTMLInputElement} */ const el = /** @type {any} */ (
                ev.currentTarget
              );
              const next = el.value || '';
              if (next !== value) {
                await on_update(id, { [key]: next });
              }
              editing.delete(k);
              request_render();
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
          request_render();
        }
      }
      @keydown=${
        /** @param {KeyboardEvent} e */ (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            editing.add(k);
            request_render();
          }
        }
      }
      >${value || ''}</span
    >`;
  }

  /**
   * @param {string} id
   * @param {'priority'|'status'} key
   * @returns {(ev: Event) => Promise<void>}
   */
  function makeSelectChange(id, key) {
    return async (ev) => {
      /** @type {HTMLSelectElement} */
      const sel = /** @type {any} */ (ev.currentTarget);
      const val = sel.value || '';
      /** @type {{ [k:string]: any }} */
      const patch = {};
      patch[key] = key === 'priority' ? Number(val) : val;
      await on_update(id, patch);
    };
  }

  /**
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
      navigate(id);
    };
  }

  /**
   * @param {IssueRowData} it
   */
  function rowTemplate(it) {
    const cur_status = String(it.status || 'open');
    const cur_prio = String(it.priority ?? 2);
    const is_selected = get_selected_id() === it.id;
    return html`<tr
      class="${row_class} ${is_selected ? 'selected' : ''}"
      data-issue-id=${it.id}
      @click=${makeRowClick(it.id)}
    >
      <td class="mono">${issueDisplayId(it.id)}</td>
      <td>${createTypeBadge(/** @type {any} */ (it).issue_type)}</td>
      <td>${editableText(it.id, 'title', it.title || '')}</td>
      <td>
        <select
          class="badge-select badge--status is-${cur_status}"
          .value=${cur_status}
          @change=${makeSelectChange(it.id, 'status')}
        >
          ${['open', 'in_progress', 'closed'].map(
            (s) =>
              html`<option value=${s} ?selected=${cur_status === s}>
                ${statusLabel(s)}
              </option>`
          )}
        </select>
      </td>
      <td>${editableText(it.id, 'assignee', it.assignee || '')}</td>
      <td>
        <select
          class="badge-select badge--priority ${'is-p' + cur_prio}"
          .value=${cur_prio}
          @change=${makeSelectChange(it.id, 'priority')}
        >
          ${priority_levels.map(
            (p, i) =>
              html`<option
                value=${String(i)}
                ?selected=${cur_prio === String(i)}
              >
                ${emojiForPriority(i)} ${p}
              </option>`
          )}
        </select>
      </td>
    </tr>`;
  }

  return rowTemplate;
}
