/* global NodeListOf */
import { html, render } from 'lit-html';
import { priority_levels } from '../utils/priority.js';
import { createTypeBadge } from '../utils/type-badge.js';

// List view implementation; requires a transport send function.

/**
 * @typedef {{ id: string, title: string, status: string, priority: number, issue_type?: string }} Issue
 */

/**
 * Create the Issues List view.
 * @param {HTMLElement} mount_element - Element to render into.
 * @param {(type: string, payload?: unknown) => Promise<unknown>} send_fn - RPC transport.
 * @param {(hash: string) => void} [navigate_fn] - Navigation function (defaults to setting location.hash).
 * @param {{ getState: () => any, setState: (patch: any) => void, subscribe: (fn: (s:any)=>void)=>()=>void }} [store] - Optional state store.
 * @returns {{ load: () => Promise<void>, destroy: () => void }} View API.
 */
export function createListView(mount_element, send_fn, navigate_fn, store) {
  /** @type {string} */
  let status_filter = 'all';
  /** @type {string} */
  let search_text = '';
  /** @type {Issue[]} */
  let issues_cache = [];
  /** @type {string | null} */
  let selected_id = store ? store.getState().selected_id : null;
  /** @type {null | (() => void)} */
  let unsubscribe = null;

  /**
   * Event: select status change.
   */
  /**
   * @param {Event} ev
   */
  const onStatusChange = async (ev) => {
    /** @type {HTMLSelectElement} */
    const sel = /** @type {any} */ (ev.currentTarget);
    status_filter = sel.value;
    if (store) {
      store.setState({
        filters: { status: /** @type {any} */ (status_filter) }
      });
    }
    // Always reload on status changes
    await load();
  };

  /**
   * Event: search input.
   */
  /**
   * @param {Event} ev
   */
  const onSearchInput = (ev) => {
    /** @type {HTMLInputElement} */
    const input = /** @type {any} */ (ev.currentTarget);
    search_text = input.value;
    if (store) {
      store.setState({ filters: { search: search_text } });
    }
    doRender();
  };

  // Initialize filters from store on first render so reload applies persisted state
  if (store) {
    const s = store.getState();
    if (s && s.filters && typeof s.filters === 'object') {
      status_filter = s.filters.status || 'all';
      search_text = s.filters.search || '';
    }
  }
  // Initial values are reflected via bound `.value` in the template

  /**
   * Build lit-html template for the list view.
   */
  function template() {
    /** @type {Issue[]} */
    let filtered = issues_cache;
    if (status_filter !== 'all' && status_filter !== 'ready') {
      filtered = filtered.filter((it) => it.status === status_filter);
    }
    if (search_text) {
      const needle = search_text.toLowerCase();
      filtered = filtered.filter((it) => {
        const a = String(it.id).toLowerCase();
        const b = String(it.title).toLowerCase();
        return a.includes(needle) || b.includes(needle);
      });
    }

    return html`
      <div class="panel__header">
        <select @change=${onStatusChange} .value=${status_filter}>
          <option value="all">All</option>
          <option value="ready">Ready</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="closed">Closed</option>
        </select>
        ${' '}
        <input
          type="search"
          placeholder="Search…"
          @input=${onSearchInput}
          .value=${search_text}
        />
      </div>
      <div class="panel__body" id="list-root">
        <ul>
          ${filtered.map((it) => {
            const is_selected = selected_id === it.id;
            return html`
              <li
                class="issue-item ${is_selected ? 'selected' : ''}"
                data-issue-id=${it.id}
                @click=${() => {
                  const nav =
                    navigate_fn || ((h) => (window.location.hash = h));
                  nav(`#/issue/${it.id}`);
                }}
              >
                <div class="text-truncate">
                  <div class="issue-title text-truncate">
                    <span>${it.title || '(no title)'}</span>
                  </div>
                  <div class="issue-meta">
                    ${it.status} · ${priority_levels[it.priority]}
                  </div>
                </div>
                <div class="issue-right">
                  <span class="issue-id mono">${it.id}</span>
                  ${createTypeBadge(/** @type {any} */ (it).issue_type)}
                </div>
              </li>
            `;
          })}
        </ul>
      </div>
    `;
  }

  /**
   * Render the current issues_cache with filters applied.
   */
  function doRender() {
    render(template(), mount_element);
  }

  // Initial render (header + body shell with current state)
  doRender();
  // no separate ready checkbox when using select option

  /**
   * Load issues from backend and re-render.
   */
  async function load() {
    /** @type {any} */
    const filters = {};
    if (status_filter !== 'all' && status_filter !== 'ready') {
      filters.status = status_filter;
    }
    if (status_filter === 'ready') {
      filters.ready = true;
    }
    /** @type {unknown} */
    let result;
    try {
      result = await send_fn('list-issues', { filters });
    } catch {
      result = [];
    }
    if (!Array.isArray(result)) {
      issues_cache = [];
    } else {
      issues_cache = /** @type {Issue[]} */ (result);
    }
    doRender();
  }

  // Keyboard navigation
  mount_element.tabIndex = 0;
  mount_element.addEventListener('keydown', (ev) => {
    /** @type {HTMLUListElement|null} */
    const ul = /** @type {any} */ (
      mount_element.querySelector('#list-root ul')
    );
    /** @type {NodeListOf<HTMLLIElement>} */
    const items = ul ? ul.querySelectorAll('li') : /** @type {any} */ ([]);
    if (items.length === 0) {
      return;
    }
    let idx = 0;
    if (selected_id) {
      const arr = Array.from(items);
      idx = arr.findIndex((el) => {
        const did = el.getAttribute('data-issue-id') || '';
        return did === selected_id;
      });
      if (idx < 0) {
        idx = 0;
      }
    }
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      const next = items[Math.min(idx + 1, items.length - 1)];
      const next_id = next ? next.getAttribute('data-issue-id') : '';
      const set = next_id ? next_id : null;
      if (store && set) {
        store.setState({ selected_id: set });
      }
      selected_id = set;
      doRender();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      const prev = items[Math.max(idx - 1, 0)];
      const prev_id = prev ? prev.getAttribute('data-issue-id') : '';
      const set = prev_id ? prev_id : null;
      if (store && set) {
        store.setState({ selected_id: set });
      }
      selected_id = set;
      doRender();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const current = items[idx];
      const id = current ? current.getAttribute('data-issue-id') : '';
      if (id) {
        const nav = navigate_fn || ((h) => (window.location.hash = h));
        nav(`#/issue/${id}`);
      }
    }
  });

  // Keep selection in sync with store
  if (store) {
    unsubscribe = store.subscribe((s) => {
      if (s.selected_id !== selected_id) {
        selected_id = s.selected_id;
        doRender();
      }
      if (s.filters && typeof s.filters === 'object') {
        const next_status = s.filters.status;
        const next_search = s.filters.search || '';
        let needs_render = false;
        if (next_status !== status_filter) {
          status_filter = next_status;
          // Reload on any status scope change to keep cache correct
          void load();
          return;
        }
        if (next_search !== search_text) {
          search_text = next_search;
          needs_render = true;
        }
        if (needs_render) {
          doRender();
        }
      }
    });
  }

  return {
    load,
    destroy() {
      mount_element.replaceChildren();
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    }
  };
}
