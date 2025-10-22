// List view implementation; requires a transport send function.

/**
 * @typedef {{ id: string, title: string, status: string, priority: number }} Issue
 */

/**
 * Create the Issues List view.
 * @param {HTMLElement} mount_element - Element to render into.
 * @param {(type: string, payload?: unknown) => Promise<unknown>} send_fn - RPC transport.
 * @param {(hash: string) => void} [navigate_fn] - Navigation function (defaults to setting location.hash).
 * @returns {{ load: () => Promise<void>, destroy: () => void }} View API.
 */
export function createListView(mount_element, send_fn, navigate_fn) {
  /** @type {string} */
  let status_filter = 'all';
  /** @type {string} */
  let search_text = '';
  /** @type {Issue[]} */
  let issues_cache = [];

  /** @type {HTMLSelectElement} */
  const status_select = document.createElement('select');
  status_select.innerHTML = [
    ['all', 'All'],
    ['open', 'Open'],
    ['in_progress', 'In progress'],
    ['closed', 'Closed'],
  ]
    .map(([v, t]) => `<option value="${v}">${t}</option>`)
    .join('');
  status_select.value = status_filter;

  /** @type {HTMLInputElement} */
  const search_input = document.createElement('input');
  search_input.type = 'search';
  search_input.placeholder = 'Search…';

  /** @type {HTMLElement} */
  const header = document.createElement('div');
  header.className = 'panel__header';
  header.appendChild(status_select);
  header.appendChild(document.createTextNode(' '));
  header.appendChild(search_input);

  /** @type {HTMLElement} */
  const body = document.createElement('div');
  body.className = 'panel__body';
  /** @type {HTMLUListElement} */
  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';
  body.appendChild(list);

  mount_element.replaceChildren(header, body);

  /**
   * Render the current issues_cache with filters applied.
   */
  function render() {
    /** @type {Issue[]} */
    let filtered = issues_cache;
    if (status_filter !== 'all') {
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
      li.style.padding = '8px 6px';
      li.style.cursor = 'pointer';
      li.dataset.issueId = it.id;
      li.addEventListener('click', () => {
        const nav = navigate_fn || ((h) => (window.location.hash = h));
        nav(`#/issue/${it.id}`);
      });

      /** @type {HTMLSpanElement} */
      const id_span = document.createElement('span');
      id_span.textContent = it.id;
      id_span.style.fontWeight = '600';
      id_span.style.marginRight = '8px';

      /** @type {HTMLSpanElement} */
      const title_span = document.createElement('span');
      title_span.textContent = it.title || '(no title)';

      /** @type {HTMLSpanElement} */
      const meta_span = document.createElement('span');
      meta_span.className = 'muted';
      meta_span.style.float = 'right';
      meta_span.textContent = `${it.status} · p${it.priority}`;

      li.appendChild(id_span);
      li.appendChild(title_span);
      li.appendChild(meta_span);
      list.appendChild(li);
    }
  }

  status_select.addEventListener('change', () => {
    status_filter = status_select.value;
    render();
  });
  search_input.addEventListener('input', () => {
    search_text = search_input.value;
    render();
  });

  /**
   * Load issues from backend and re-render.
   */
  async function load() {
    /** @type {any} */
    const filters = {};
    if (status_filter !== 'all') {
      filters.status = status_filter;
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

  return {
    load,
    destroy() {
      mount_element.replaceChildren();
    },
  };
}
