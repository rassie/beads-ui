// Issue Detail view implementation.

/**
 * @typedef {Object} Dependency
 * @property {string} issue_id
 * @property {string} depends_on_id
 * @property {string} type
 */

/**
 * @typedef {Object} IssueDetail
 * @property {string} id
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [status]
 * @property {number} [priority]
 * @property {Dependency[]} [dependencies]
 * @property {Dependency[]} [dependents]
 */

/**
 * Create the Issue Detail view.
 * @param {HTMLElement} mount_element - Element to render into.
 * @param {(type: string, payload?: unknown) => Promise<unknown>} send_fn - RPC transport.
 * @param {(hash: string) => void} [navigate_fn] - Navigation function; defaults to setting location.hash.
 * @returns {{ load: (id: string) => Promise<void>, clear: () => void, destroy: () => void }} View API.
 */
export function createDetailView(mount_element, send_fn, navigate_fn) {
  /**
   * Render a placeholder message.
   * @param {string} message
   */
  function renderPlaceholder(message) {
    /** @type {HTMLParagraphElement} */
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = message;
    mount_element.replaceChildren(p);
  }

  /** @param {string} id */
  function linkFor(id) {
    /** @type {HTMLAnchorElement} */
    const a = document.createElement('a');
    a.href = `#/issue/${id}`;
    a.textContent = id;
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const nav = navigate_fn || ((h) => (window.location.hash = h));
      nav(a.getAttribute('href') || '#');
    });
    return a;
  }

  /**
   * Render an IssueDetail object.
   * @param {IssueDetail} issue
   */
  function render(issue) {
    /** @type {HTMLElement} */
    const container = document.createElement('div');

    // Header: ID and Title
    /** @type {HTMLHeadingElement} */
    const h = document.createElement('h2');
    h.style.margin = '0 0 8px';
    /** @type {HTMLSpanElement} */
    const id_span = document.createElement('span');
    id_span.textContent = issue.id;
    id_span.style.fontWeight = '700';
    id_span.style.marginRight = '8px';
    /** @type {HTMLSpanElement} */
    const title_span = document.createElement('span');
    title_span.textContent = issue.title || '';
    h.appendChild(id_span);
    h.appendChild(title_span);

    // Meta row
    /** @type {HTMLDivElement} */
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.style.marginBottom = '12px';
    meta.textContent = `${issue.status || ''}${issue.status ? ' · ' : ''}p${issue.priority ?? ''}`;

    // Description
    /** @type {HTMLDivElement} */
    const desc = document.createElement('div');
    desc.style.whiteSpace = 'pre-wrap';
    desc.style.marginBottom = '16px';
    desc.textContent = issue.description || '';

    // Dependencies
    /** @type {HTMLDivElement} */
    const deps = document.createElement('div');
    deps.style.display = 'grid';
    deps.style.gridTemplateColumns = '1fr 1fr';
    deps.style.gap = '12px';

    /**
     * @param {string} title
     * @param {string[]} ids
     */
    function makeList(title, ids) {
      /** @type {HTMLDivElement} */
      const box = document.createElement('div');
      /** @type {HTMLDivElement} */
      const head = document.createElement('div');
      head.className = 'muted';
      head.textContent = title;
      /** @type {HTMLUListElement} */
      const ul = document.createElement('ul');
      ul.style.listStyle = 'none';
      ul.style.padding = '0';
      ul.style.margin = '4px 0 0';
      if (ids.length === 0) {
        /** @type {HTMLLIElement} */
        const li = document.createElement('li');
        li.textContent = '(none)';
        li.className = 'muted';
        ul.appendChild(li);
      } else {
        for (const did of ids) {
          /** @type {HTMLLIElement} */
          const li = document.createElement('li');
          li.appendChild(linkFor(did));
          ul.appendChild(li);
        }
      }
      box.appendChild(head);
      box.appendChild(ul);
      return box;
    }

    /** @type {string[]} */
    const blocked_by = [];
    /** @type {string[]} */
    const blocks = [];

    if (Array.isArray(issue.dependencies)) {
      for (const d of issue.dependencies) {
        if (d && d.type === 'blocks' && d.issue_id === issue.id) {
          blocked_by.push(d.depends_on_id);
        }
      }
    }
    if (Array.isArray(issue.dependents)) {
      for (const d of issue.dependents) {
        if (d && d.type === 'blocks' && d.depends_on_id === issue.id) {
          blocks.push(d.issue_id);
        }
      }
    }

    deps.appendChild(makeList('Blocked by', blocked_by));
    deps.appendChild(makeList('Blocks', blocks));

    container.appendChild(h);
    container.appendChild(meta);
    container.appendChild(desc);
    container.appendChild(deps);

    mount_element.replaceChildren(container);
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
        result = await send_fn('show-issue', { id });
      } catch {
        result = null;
      }
      if (!result || typeof result !== 'object') {
        renderPlaceholder('Issue not found');
        return;
      }
      const issue = /** @type {IssueDetail} */ (result);
      if (!issue || issue.id !== id) {
        renderPlaceholder('Issue not found');
        return;
      }
      render(issue);
    },
    clear() {
      renderPlaceholder('Select an issue to view details');
    },
    destroy() {
      mount_element.replaceChildren();
    },
  };
}
