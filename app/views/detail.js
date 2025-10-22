// Issue Detail view implementation.
import { renderMarkdown } from '../utils/markdown.js';

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
 * @param {(type: string, payload?: unknown) => Promise<unknown>} send_fn - RPC transport.
 * @param {(hash: string) => void} [navigate_fn] - Navigation function; defaults to setting location.hash.
 * @returns {{ load: (id: string) => Promise<void>, clear: () => void, destroy: () => void }} View API.
 */
export function createDetailView(mount_element, send_fn, navigate_fn) {
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
    container.style.position = 'relative';

    // Header: ID and Title
    /** @type {HTMLHeadingElement} */
    const h = document.createElement('h2');
    h.style.margin = '0 0 8px';
    /** @type {HTMLSpanElement} */
    const id_span = document.createElement('span');
    id_span.textContent = issue.id;
    id_span.style.fontWeight = '700';
    id_span.style.marginRight = '8px';
    h.appendChild(id_span);

    if (edit_title) {
      /** @type {HTMLInputElement} */
      const title_input = document.createElement('input');
      title_input.type = 'text';
      title_input.value = issue.title || '';
      title_input.size = Math.min(80, Math.max(20, (issue.title || '').length + 5));
      title_input.setAttribute('aria-label', 'Edit title');
      title_input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          edit_title = false;
          render(current || issue);
        } else if (ev.key === 'Enter') {
          ev.preventDefault();
          title_save.click();
        }
      });
      /** @type {HTMLButtonElement} */
      const title_save = document.createElement('button');
      title_save.textContent = 'Save';
      title_save.style.marginLeft = '6px';
      title_save.addEventListener('click', async () => {
        if (pending || !current) {
          return;
        }
        const prev = current.title || '';
        const next = title_input.value;
        if (next === prev) {
          edit_title = false;
          render(current);
          return;
        }
        pending = true;
        title_input.disabled = true;
        title_save.disabled = true;
        current.title = next;
        try {
          /** @type {any} */
          const updated = await send_fn('edit-text', {
            id: current.id,
            field: 'title',
            value: next,
          });
          if (updated && typeof updated === 'object') {
            current = /** @type {IssueDetail} */ (updated);
            edit_title = false;
            render(current);
          }
        } catch {
          current.title = prev;
          edit_title = false;
          render(current);
          showToast('Failed to save title');
        } finally {
          pending = false;
        }
      });
      /** @type {HTMLButtonElement} */
      const title_cancel = document.createElement('button');
      title_cancel.textContent = 'Cancel';
      title_cancel.style.marginLeft = '6px';
      title_cancel.addEventListener('click', () => {
        edit_title = false;
        render(current || issue);
      });
      h.appendChild(title_input);
      h.appendChild(title_save);
      h.appendChild(title_cancel);
    } else {
      /** @type {HTMLSpanElement} */
      const title_span = document.createElement('span');
      title_span.className = 'editable';
      title_span.setAttribute('tabindex', '0');
      title_span.setAttribute('role', 'button');
      title_span.setAttribute('aria-label', 'Edit title');
      title_span.textContent = issue.title || '';
      title_span.addEventListener('click', () => {
        edit_title = true;
        render(issue);
      });
      title_span.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          edit_title = true;
          render(issue);
        }
      });
      h.appendChild(title_span);
    }

    // Meta row
    /** @type {HTMLDivElement} */
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.style.marginBottom = '12px';
    // Status select
    /** @type {HTMLSelectElement} */
    const status_select = document.createElement('select');
    status_select.innerHTML = [
      ['open', 'Open'],
      ['in_progress', 'In progress'],
      ['closed', 'Closed'],
    ]
      .map(([v, t]) => `<option value="${v}">${t}</option>`)
      .join('');
    status_select.value = issue.status || 'open';
    status_select.addEventListener('change', async () => {
      if (pending || !current) {
        status_select.value = current?.status || 'open';
        return;
      }
      const prev = current.status || 'open';
      const next = status_select.value;
      if (next === prev) {
        return;
      }
      pending = true;
      status_select.disabled = true;
      current.status = next;
      try {
        /** @type {any} */
        const updated = await send_fn('update-status', { id: current.id, status: next });
        if (updated && typeof updated === 'object') {
          current = /** @type {IssueDetail} */ (updated);
          render(current);
        }
      } catch {
        current.status = prev;
        render(current);
        showToast('Failed to update status');
      } finally {
        pending = false;
      }
    });

    // Priority select 0..4
    /** @type {HTMLSelectElement} */
    const priority_select = document.createElement('select');
    priority_select.innerHTML = [0, 1, 2, 3, 4]
      .map((n) => `<option value="${n}">p${n}</option>`)
      .join('');
    priority_select.value = String(issue.priority ?? 2);
    priority_select.addEventListener('change', async () => {
      if (pending || !current) {
        priority_select.value = String(current?.priority ?? 2);
        return;
      }
      const prev = typeof current.priority === 'number' ? current.priority : 2;
      const next = Number(priority_select.value);
      if (next === prev) {
        return;
      }
      pending = true;
      priority_select.disabled = true;
      current.priority = next;
      try {
        /** @type {any} */
        const updated = await send_fn('update-priority', { id: current.id, priority: next });
        if (updated && typeof updated === 'object') {
          current = /** @type {IssueDetail} */ (updated);
          render(current);
        }
      } catch {
        current.priority = prev;
        render(current);
        showToast('Failed to update priority');
      } finally {
        pending = false;
      }
    });

    meta.replaceChildren(status_select, document.createTextNode(' · '), priority_select);

    // Description (markdown read-mode + inline edit)
    /** @type {HTMLDivElement} */
    const desc_box = document.createElement('div');
    desc_box.style.marginBottom = '8px';
    if (edit_desc) {
      /** @type {HTMLTextAreaElement} */
      const desc_input = document.createElement('textarea');
      desc_input.value = issue.description || '';
      desc_input.rows = 8;
      desc_input.style.width = '100%';
      desc_input.setAttribute('aria-label', 'Edit description');
      desc_input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          edit_desc = false;
          render(current || issue);
        } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
          ev.preventDefault();
          desc_save.click();
        }
      });
      /** @type {HTMLDivElement} */
      const actions = document.createElement('div');
      actions.className = 'editable-actions';
      /** @type {HTMLButtonElement} */
      const desc_save = document.createElement('button');
      desc_save.textContent = 'Save';
      desc_save.addEventListener('click', async () => {
        if (pending || !current) {
          return;
        }
        const prev = current.description || '';
        const next = desc_input.value;
        if (next === prev) {
          edit_desc = false;
          render(current);
          return;
        }
        pending = true;
        desc_input.disabled = true;
        desc_save.disabled = true;
        current.description = next;
        try {
          /** @type {any} */
          const updated = await send_fn('edit-text', {
            id: current.id,
            field: 'description',
            value: next,
          });
          if (updated && typeof updated === 'object') {
            current = /** @type {IssueDetail} */ (updated);
            edit_desc = false;
            render(current);
          }
        } catch {
          current.description = prev;
          edit_desc = false;
          render(current);
          showToast('Failed to save description');
        } finally {
          pending = false;
        }
      });
      /** @type {HTMLButtonElement} */
      const desc_cancel = document.createElement('button');
      desc_cancel.textContent = 'Cancel';
      desc_cancel.addEventListener('click', () => {
        edit_desc = false;
        render(current || issue);
      });
      actions.appendChild(desc_save);
      actions.appendChild(desc_cancel);
      desc_box.appendChild(desc_input);
      desc_box.appendChild(actions);
    } else {
      /** @type {HTMLDivElement} */
      const md_wrap = document.createElement('div');
      md_wrap.className = 'md editable';
      md_wrap.setAttribute('tabindex', '0');
      md_wrap.setAttribute('role', 'button');
      md_wrap.setAttribute('aria-label', 'Edit description');
      const text = issue.description || '';
      const frag = renderMarkdown(text);
      md_wrap.appendChild(frag);
      md_wrap.addEventListener('click', () => {
        edit_desc = true;
        render(issue);
      });
      md_wrap.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          edit_desc = true;
          render(issue);
        }
      });
      desc_box.appendChild(md_wrap);
    }

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
          // remove button
          /** @type {HTMLButtonElement} */
          const rm = document.createElement('button');
          rm.textContent = '×';
          rm.setAttribute('aria-label', `Remove dependency ${did}`);
          rm.style.marginLeft = '6px';
          rm.addEventListener('click', async () => {
            if (!current || pending) {
              return;
            }
            pending = true;
            try {
              // Determine direction based on list title
              if (title === 'Dependencies') {
                // current depends on did → remove (current, did)
                /** @type {any} */
                const updated = await send_fn('dep-remove', {
                  a: current.id,
                  b: did,
                  view_id: current.id,
                });
                if (updated && typeof updated === 'object') {
                  current = /** @type {IssueDetail} */ (updated);
                  render(current);
                }
              } else {
                // Blocks: did depends on current → remove (did, current)
                /** @type {any} */
                const updated = await send_fn('dep-remove', {
                  a: did,
                  b: current.id,
                  view_id: current.id,
                });
                if (updated && typeof updated === 'object') {
                  current = /** @type {IssueDetail} */ (updated);
                  render(current);
                }
              }
            } catch {
              showToast('Failed to remove dependency');
            } finally {
              pending = false;
            }
          });
          li.appendChild(rm);
          ul.appendChild(li);
        }
      }
      box.appendChild(head);
      box.appendChild(ul);
      return box;
    }

    /** @type {string[]} */
    const dependencies = [];
    /** @type {string[]} */
    const dependents = [];

    if (Array.isArray(issue.dependencies)) {
      for (const d of issue.dependencies) {
        dependencies.push(d.id);
      }
    }
    if (Array.isArray(issue.dependents)) {
      for (const d of issue.dependents) {
        dependents.push(d.id);
      }
    }

    const dependencies_box = makeList('Dependencies', dependencies);
    const dependents_box = makeList('Dependents', dependents);

    // Add controls
    /**
     * @param {HTMLDivElement} container
     * @param {'dependency' | 'dependent'} mode
     */
    function attachAddControls(container, mode) {
      /** @type {HTMLDivElement} */
      const row = document.createElement('div');
      row.style.marginTop = '6px';
      /** @type {HTMLInputElement} */
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Issue ID (e.g., UI-12)';
      input.setAttribute('data-testid', mode === 'dependency' ? 'add-dependency' : 'add-dependent');
      /** @type {HTMLButtonElement} */
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add';
      addBtn.style.marginLeft = '6px';
      addBtn.addEventListener('click', async () => {
        if (!current || pending) {
          return;
        }
        const target = input.value.trim();
        if (!target || target === current.id) {
          showToast('Enter a different issue id');
          return;
        }
        // duplicate prevention
        const set = new Set(mode === 'dependency' ? dependencies : dependents);
        if (set.has(target)) {
          showToast('Link already exists');
          return;
        }
        pending = true;
        addBtn.disabled = true;
        input.disabled = true;
        try {
          if (mode === 'dependency') {
            /** @type {any} */
            const updated = await send_fn('dep-add', {
              a: current.id,
              b: target,
              view_id: current.id,
            });
            if (updated && typeof updated === 'object') {
              current = /** @type {IssueDetail} */ (updated);
              render(current);
            }
          } else {
            /** @type {any} */
            const updated = await send_fn('dep-add', {
              a: target,
              b: current.id,
              view_id: current.id,
            });
            if (updated && typeof updated === 'object') {
              current = /** @type {IssueDetail} */ (updated);
              render(current);
            }
          }
        } catch {
          showToast('Failed to add dependency');
        } finally {
          pending = false;
        }
      });
      row.appendChild(input);
      row.appendChild(addBtn);
      container.appendChild(row);
    }

    attachAddControls(dependencies_box, 'dependency');
    attachAddControls(dependents_box, 'dependent');

    deps.appendChild(dependencies_box);
    deps.appendChild(dependents_box);

    container.appendChild(h);
    container.appendChild(meta);
    container.appendChild(desc_box);

    // Acceptance (markdown read-mode + inline edit)
    /** @type {HTMLDivElement} */
    const acc_box = document.createElement('div');
    acc_box.style.marginBottom = '8px';
    /** @type {HTMLDivElement} */
    const acc_head = document.createElement('div');
    acc_head.className = 'muted';
    acc_head.textContent = 'Acceptance';
    acc_box.appendChild(acc_head);
    if (edit_accept) {
      /** @type {HTMLTextAreaElement} */
      const acc_input = document.createElement('textarea');
      acc_input.value = issue.acceptance || '';
      acc_input.rows = 6;
      acc_input.style.width = '100%';
      acc_input.setAttribute('aria-label', 'Edit acceptance');
      acc_input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          edit_accept = false;
          render(current || issue);
        } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
          ev.preventDefault();
          acc_save.click();
        }
      });
      /** @type {HTMLDivElement} */
      const actions = document.createElement('div');
      actions.className = 'editable-actions';
      /** @type {HTMLButtonElement} */
      const acc_save = document.createElement('button');
      acc_save.textContent = 'Save';
      acc_save.addEventListener('click', async () => {
        if (pending || !current) {
          return;
        }
        const prev = current.acceptance || '';
        const next = acc_input.value;
        if (next === prev) {
          edit_accept = false;
          render(current);
          return;
        }
        pending = true;
        acc_input.disabled = true;
        acc_save.disabled = true;
        current.acceptance = next;
        try {
          /** @type {any} */
          const updated = await send_fn('edit-text', {
            id: current.id,
            field: 'acceptance',
            value: next,
          });
          if (updated && typeof updated === 'object') {
            current = /** @type {IssueDetail} */ (updated);
            edit_accept = false;
            render(current);
          }
        } catch {
          current.acceptance = prev;
          edit_accept = false;
          render(current);
          showToast('Failed to save acceptance');
        } finally {
          pending = false;
        }
      });
      /** @type {HTMLButtonElement} */
      const acc_cancel = document.createElement('button');
      acc_cancel.textContent = 'Cancel';
      acc_cancel.addEventListener('click', () => {
        edit_accept = false;
        render(current || issue);
      });
      actions.appendChild(acc_save);
      actions.appendChild(acc_cancel);
      acc_box.appendChild(acc_input);
      acc_box.appendChild(actions);
    } else {
      /** @type {HTMLDivElement} */
      const md_wrap = document.createElement('div');
      md_wrap.className = 'md editable';
      md_wrap.setAttribute('tabindex', '0');
      md_wrap.setAttribute('role', 'button');
      md_wrap.setAttribute('aria-label', 'Edit acceptance');
      const text = issue.acceptance || '';
      const frag = renderMarkdown(text);
      md_wrap.appendChild(frag);
      md_wrap.addEventListener('click', () => {
        edit_accept = true;
        render(issue);
      });
      md_wrap.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          edit_accept = true;
          render(issue);
        }
      });
      acc_box.appendChild(md_wrap);
    }
    container.appendChild(acc_box);
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
      current = issue;
      pending = false;
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
