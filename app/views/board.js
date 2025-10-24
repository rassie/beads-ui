import { html, render } from 'lit-html';
import { createIssueIdRenderer } from '../utils/issue-id-renderer.js';
import { createPriorityBadge } from '../utils/priority-badge.js';
import { createTypeBadge } from '../utils/type-badge.js';

/**
 * @typedef {{ id: string, title?: string, status?: 'open'|'in_progress'|'closed', priority?: number, issue_type?: string, updated_at?: string }} IssueLite
 */

/**
 * Create the Board view with four columns: Open, Ready, In progress, Closed.
 * Data providers are expected to return raw arrays; this view applies sorting.
 *
 * Sorting rules:
 * - Open: updated_at desc
 * - Ready: priority asc, then updated_at desc when present
 * - In progress: updated_at desc
 * - Closed: updated_at desc
 * @param {HTMLElement} mount_element
 * @param {{ getOpen: () => Promise<any[]>, getReady: () => Promise<any[]>, getInProgress: () => Promise<any[]>, getClosed: (limit?: number) => Promise<any[]> }} data
 * @param {(id: string) => void} goto_issue - Navigate to issue detail.
 * @returns {{ load: () => Promise<void>, clear: () => void }}
 */
export function createBoardView(mount_element, data, goto_issue) {
  /** @type {IssueLite[]} */
  let list_open = [];
  /** @type {IssueLite[]} */
  let list_ready = [];
  /** @type {IssueLite[]} */
  let list_in_progress = [];
  /** @type {IssueLite[]} */
  let list_closed = [];

  function template() {
    return html`
      <div class="panel__body board-root">
        ${columnTemplate('Open', 'open-col', list_open)}
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
        <header
          class="board-column__header"
          id=${id + '-header'}
          role="heading"
          aria-level="2"
        >
          ${title}
        </header>
        <div
          class="board-column__body"
          role="list"
          aria-labelledby=${id + '-header'}
        >
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
        role="listitem"
        tabindex="-1"
        @click=${() => goto_issue(it.id)}
      >
        <div class="board-card__title text-truncate">
          ${it.title || '(no title)'}
        </div>
        <div class="board-card__meta">
          ${createTypeBadge(/** @type {any} */ (it).issue_type)}
          ${createPriorityBadge(/** @type {any} */ (it).priority)}
          ${createIssueIdRenderer(it.id, { class_name: 'mono' })}
        </div>
      </article>
    `;
  }

  function doRender() {
    render(template(), mount_element);
    postRenderEnhance();
  }

  /**
   * Enhance rendered board with a11y and keyboard navigation.
   * - Roving tabindex per column (first card tabbable)
   * - ArrowUp/ArrowDown within column
   * - ArrowLeft/ArrowRight to adjacent non-empty column (focus top card)
   * - Enter/Space to open details for focused card
   */
  function postRenderEnhance() {
    try {
      /** @type {HTMLElement[]} */
      const columns = Array.from(
        mount_element.querySelectorAll('.board-column')
      );
      for (const col of columns) {
        /** @type {HTMLElement|null} */
        const body = /** @type {any} */ (
          col.querySelector('.board-column__body')
        );
        if (!body) {
          continue;
        }
        /** @type {HTMLElement[]} */
        const cards = Array.from(body.querySelectorAll('.board-card'));
        // Assign aria-label using column header for screen readers
        const header = /** @type {HTMLElement|null} */ (
          col.querySelector('.board-column__header')
        );
        const col_name = header ? header.textContent?.trim() || '' : '';
        for (const card of cards) {
          const title_el = /** @type {HTMLElement|null} */ (
            card.querySelector('.board-card__title')
          );
          const t = title_el ? title_el.textContent?.trim() || '' : '';
          card.setAttribute(
            'aria-label',
            `Issue ${t || '(no title)'} — Column ${col_name}`
          );
          // Default roving setup
          card.tabIndex = -1;
        }
        if (cards.length > 0) {
          cards[0].tabIndex = 0;
        }
      }
    } catch {
      // non-fatal
    }
  }

  // Delegate keyboard handling from mount_element
  mount_element.addEventListener('keydown', (ev) => {
    /** @type {HTMLElement} */
    const target = /** @type {any} */ (ev.target);
    if (!target || !(target instanceof HTMLElement)) {
      return;
    }
    // Do not intercept keys inside editable controls
    const tag = String(target.tagName || '').toLowerCase();
    if (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      /** @type {any} */ (target).isContentEditable === true
    ) {
      return;
    }
    const card = target.closest('.board-card');
    if (!card) {
      return;
    }
    const key = String(ev.key || '');
    if (key === 'Enter' || key === ' ') {
      ev.preventDefault();
      const id = /** @type {HTMLElement} */ (card).getAttribute(
        'data-issue-id'
      );
      if (id) {
        goto_issue(id);
      }
      return;
    }
    if (
      key !== 'ArrowUp' &&
      key !== 'ArrowDown' &&
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight'
    ) {
      return;
    }
    ev.preventDefault();
    // Column context
    const col = /** @type {HTMLElement|null} */ (card.closest('.board-column'));
    if (!col) {
      return;
    }
    const body = /** @type {HTMLElement|null} */ (
      col.querySelector('.board-column__body')
    );
    if (!body) {
      return;
    }
    /** @type {HTMLElement[]} */
    const cards = Array.from(body.querySelectorAll('.board-card'));
    const idx = cards.indexOf(/** @type {HTMLElement} */ (card));
    if (idx === -1) {
      return;
    }
    if (key === 'ArrowDown' && idx < cards.length - 1) {
      moveFocus(cards[idx], cards[idx + 1]);
      return;
    }
    if (key === 'ArrowUp' && idx > 0) {
      moveFocus(cards[idx], cards[idx - 1]);
      return;
    }
    if (key === 'ArrowRight' || key === 'ArrowLeft') {
      // Find adjacent column with at least one card
      /** @type {HTMLElement[]} */
      const cols = Array.from(mount_element.querySelectorAll('.board-column'));
      const col_idx = cols.indexOf(col);
      if (col_idx === -1) {
        return;
      }
      const dir = key === 'ArrowRight' ? 1 : -1;
      let next_idx = col_idx + dir;
      /** @type {HTMLElement|null} */
      let target_col = null;
      while (next_idx >= 0 && next_idx < cols.length) {
        const candidate = cols[next_idx];
        const c_body = /** @type {HTMLElement|null} */ (
          candidate.querySelector('.board-column__body')
        );
        const c_cards = c_body
          ? Array.from(c_body.querySelectorAll('.board-card'))
          : [];
        if (c_cards.length > 0) {
          target_col = candidate;
          break;
        }
        next_idx += dir;
      }
      if (target_col) {
        const first = /** @type {HTMLElement|null} */ (
          target_col.querySelector('.board-column__body .board-card')
        );
        if (first) {
          moveFocus(/** @type {HTMLElement} */ (card), first);
        }
      }
      return;
    }
  });

  /**
   * @param {HTMLElement} from
   * @param {HTMLElement} to
   */
  function moveFocus(from, to) {
    try {
      from.tabIndex = -1;
      to.tabIndex = 0;
      to.focus();
    } catch {
      // ignore focus errors
    }
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
      let o = [];
      /** @type {IssueLite[]} */
      let r = [];
      /** @type {IssueLite[]} */
      let p = [];
      /** @type {IssueLite[]} */
      let c = [];
      try {
        o = /** @type {any} */ (await data.getOpen());
      } catch {
        o = [];
      }
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

      // Remove items from Open that are already in Ready by id
      if (o.length > 0 && r.length > 0) {
        /** @type {Set<string>} */
        const ready_ids = new Set(r.map((it) => it.id));
        o = o.filter((it) => !ready_ids.has(it.id));
      }

      // Remove items from Ready that are already In Progress by id
      if (r.length > 0 && p.length > 0) {
        /** @type {Set<string>} */
        const in_progress_ids = new Set(p.map((it) => it.id));
        r = r.filter((it) => !in_progress_ids.has(it.id));
      }

      sortByUpdatedDesc(o);
      sortReady(r);
      sortByUpdatedDesc(p);
      sortByUpdatedDesc(c);

      list_open = o;
      list_ready = r;
      list_in_progress = p;
      list_closed = c;
      doRender();
    },
    clear() {
      mount_element.replaceChildren();
      list_open = [];
      list_ready = [];
      list_in_progress = [];
      list_closed = [];
    }
  };
}
