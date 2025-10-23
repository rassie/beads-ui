import { html, render } from 'lit-html';

/**
 * @typedef {{ id: string, title?: string, status?: 'open'|'in_progress'|'closed', priority?: number, issue_type?: string, updated_at?: string }} IssueLite
 */

/**
 * Create the Board view with three columns: Ready, In progress, Closed.
 * Data providers are expected to return raw arrays; this view applies sorting.
 *
 * Sorting rules:
 * - Ready: priority asc, then updated_at desc when present
 * - In progress: updated_at desc
 * - Closed: updated_at desc
 * @param {HTMLElement} mount_element
 * @param {{ getReady: () => Promise<any[]>, getInProgress: () => Promise<any[]>, getClosed: (limit?: number) => Promise<any[]> }} data
 * @param {(id: string) => void} goto_issue - Navigate to issue detail.
 * @returns {{ load: () => Promise<void>, clear: () => void }}
 */
export function createBoardView(mount_element, data, goto_issue) {
  /** @type {IssueLite[]} */
  let list_ready = [];
  /** @type {IssueLite[]} */
  let list_in_progress = [];
  /** @type {IssueLite[]} */
  let list_closed = [];

  function template() {
    return html`
      <div class="panel__header">Board</div>
      <div class="panel__body board-root">
        ${columnTemplate('Ready', 'ready-col', list_ready)}
        ${columnTemplate('In Progress', 'in-progress-col', list_in_progress)}
        ${columnTemplate('Closed', 'closed-col', list_closed)}
      </div>
    `;
  }

  /**
   * @param {string} title
   * @param {string} id
   * @param {IssueLite[]} items
   */
  function columnTemplate(title, id, items) {
    return html`
      <section class="board-column" id=${id}>
        <header class="board-column__header">${title}</header>
        <div class="board-column__body">
          ${items.map((it) => cardTemplate(it))}
        </div>
      </section>
    `;
  }

  /**
   * @param {IssueLite} it
   */
  function cardTemplate(it) {
    return html`
      <article
        class="board-card"
        data-issue-id=${it.id}
        @click=${() => goto_issue(it.id)}
      >
        <div class="board-card__title text-truncate">
          ${it.title || '(no title)'}
        </div>
        <div class="board-card__meta">
          <span class="mono">${it.id}</span>
          <span class="badge">${it.issue_type || ''}</span>
          <span class="muted">p${String(it.priority ?? '')}</span>
        </div>
      </article>
    `;
  }

  function doRender() {
    render(template(), mount_element);
  }

  /**
   * Sort helpers.
   */
  /**
   * @param {IssueLite[]} arr
   */
  function sortReady(arr) {
    arr.sort((a, b) => {
      const pa = a.priority ?? 2;
      const pb = b.priority ?? 2;
      if (pa !== pb) {
        return pa - pb;
      }
      const ua = a.updated_at || '';
      const ub = b.updated_at || '';
      return ua < ub ? 1 : ua > ub ? -1 : 0;
    });
  }

  /**
   * @param {IssueLite[]} arr
   */
  function sortByUpdatedDesc(arr) {
    arr.sort((a, b) => {
      const ua = a.updated_at || '';
      const ub = b.updated_at || '';
      return ua < ub ? 1 : ua > ub ? -1 : 0;
    });
  }

  return {
    async load() {
      /** @type {IssueLite[]} */
      let r = [];
      /** @type {IssueLite[]} */
      let p = [];
      /** @type {IssueLite[]} */
      let c = [];
      try {
        r = /** @type {any} */ (await data.getReady());
      } catch {
        r = [];
      }
      try {
        p = /** @type {any} */ (await data.getInProgress());
      } catch {
        p = [];
      }
      try {
        c = /** @type {any} */ (await data.getClosed());
      } catch {
        c = [];
      }

      sortReady(r);
      sortByUpdatedDesc(p);
      sortByUpdatedDesc(c);

      list_ready = r;
      list_in_progress = p;
      list_closed = c;
      doRender();
    },
    clear() {
      mount_element.replaceChildren();
      list_ready = [];
      list_in_progress = [];
      list_closed = [];
    }
  };
}
