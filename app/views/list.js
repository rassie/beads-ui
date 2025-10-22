/* global NodeListOf */
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

  /** @type {HTMLSelectElement} */
  const status_select = document.createElement('select');
  for (const [v, t] of [
    ['all', 'All'],
    ['ready', 'Ready'],
    ['open', 'Open'],
    ['in_progress', 'In progress'],
    ['closed', 'Closed']
  ]) {
    /** @type {HTMLOptionElement} */
    const option = document.createElement('option');
    option.value = v;
    option.textContent = t;
    status_select.appendChild(option);
  }
  status_select.value = status_filter;

  /** @type {HTMLInputElement} */
  const search_input = document.createElement('input');
  search_input.type = 'search';
  search_input.placeholder = 'Search…';

  // Initialize filters from store on first render so reload applies persisted state
  if (store) {
    const s = store.getState();
    if (s && s.filters && typeof s.filters === 'object') {
      status_filter = s.filters.status || 'all';
      search_text = s.filters.search || '';
    }
  }
  status_select.value = status_filter;
  search_input.value = search_text;

  /** @type {HTMLElement} */
  const header = document.createElement('div');
  header.className = 'panel__header';
  header.appendChild(status_select);
  header.appendChild(document.createTextNode(' '));
  header.appendChild(search_input);

  /** @type {HTMLElement} */
  const body = document.createElement('div');
  body.className = 'panel__body';
  body.id = 'list-root';
  /** @type {HTMLUListElement} */
  const list = document.createElement('ul');
  body.appendChild(list);

  mount_element.replaceChildren(header, body);

  /**
   * Render the current issues_cache with filters applied.
   */
  function render() {
    /** @type {Issue[]} */
    let filtered = issues_cache;
    if (status_filter !== 'all' && status_filter !== 'ready') {
      filtered = filtered.filter((it) => it.status === status_filter);
    }
    if (search_text) {
      const needle = search_text.toLowerCase();
      filtered = filtered.filter(
        (it) =>
          String(it.id).toLowerCase().includes(needle) ||
          String(it.title).toLowerCase().includes(needle)
      );
    }

    list.replaceChildren();
    for (const it of filtered) {
      /** @type {HTMLLIElement} */
      const li = document.createElement('li');
      li.classList.add('issue-item');
      li.dataset.issueId = it.id;
      li.addEventListener('click', () => {
        const nav = navigate_fn || ((h) => (window.location.hash = h));
        nav(`#/issue/${it.id}`);
      });

      if (selected_id === it.id) {
        li.classList.add('selected');
      }

      // Left: title row + meta row
      const text_wrap = document.createElement('div');
      text_wrap.classList.add('text-truncate');
      const title_row = document.createElement('div');
      title_row.classList.add('issue-title');
      /** @type {HTMLSpanElement} */
      const title_span = document.createElement('span');
      title_span.textContent = it.title || '(no title)';
      title_row.classList.add('text-truncate');
      title_row.appendChild(title_span);
      const meta_row = document.createElement('div');
      meta_row.classList.add('issue-meta');
      meta_row.textContent = `${it.status} · ${priority_levels[it.priority]}`;
      text_wrap.appendChild(title_row);
      text_wrap.appendChild(meta_row);

      // Right: id
      // Right column with id (top) and type badge (bottom)
      const right_wrap = document.createElement('div');
      right_wrap.classList.add('issue-right');
      /** @type {HTMLSpanElement} */
      const id_right = document.createElement('span');
      id_right.classList.add('issue-id', 'mono');
      id_right.textContent = it.id;
      const type_badge = createTypeBadge(/** @type {any} */ (it).issue_type);
      right_wrap.appendChild(id_right);
      right_wrap.appendChild(type_badge);

      li.appendChild(text_wrap);
      li.appendChild(right_wrap);
      list.appendChild(li);
    }
  }

  status_select.addEventListener('change', () => {
    status_filter = status_select.value;
    if (store) {
      store.setState({
        filters: { status: /** @type {any} */ (status_filter) }
      });
    }
    // Always reload on status changes to ensure cache matches scope
    // (e.g., switching from 'ready' back to 'all').
    void load();
  });
  search_input.addEventListener('input', () => {
    search_text = search_input.value;
    if (store) {
      store.setState({ filters: { search: search_text } });
    }
    render();
  });
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
    render();
  }

  // Keyboard navigation
  mount_element.tabIndex = 0;
  mount_element.addEventListener('keydown', (ev) => {
    /** @type {NodeListOf<HTMLLIElement>} */
    const items = list.querySelectorAll('li');
    if (items.length === 0) {
      return;
    }
    const idx = Math.max(
      0,
      selected_id
        ? Array.from(items).findIndex(
            (el) => el.dataset.issueId === selected_id
          )
        : 0
    );
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      const next = items[Math.min(idx + 1, items.length - 1)];
      const nextId = next?.dataset.issueId || null;
      if (store && nextId) {
        store.setState({ selected_id: nextId });
      }
      selected_id = nextId;
      render();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      const prev = items[Math.max(idx - 1, 0)];
      const prevId = prev?.dataset.issueId || null;
      if (store && prevId) {
        store.setState({ selected_id: prevId });
      }
      selected_id = prevId;
      render();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const current = items[idx];
      const id = current?.dataset.issueId;
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
        render();
      }
      if (s.filters && typeof s.filters === 'object') {
        const next_status = s.filters.status;
        const next_search = s.filters.search || '';
        let needs_render = false;
        if (next_status !== status_filter) {
          status_filter = next_status;
          status_select.value = status_filter;
          // Reload on any status scope change to keep cache correct
          void load();
          return;
        }
        if (next_search !== search_text) {
          search_text = next_search;
          search_input.value = search_text;
          needs_render = true;
        }
        if (needs_render) {
          render();
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
