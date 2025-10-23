import { html, render } from 'lit-html';
import { createDataLayer } from './data/providers.js';
import { createHashRouter } from './router.js';
import { createStore } from './state.js';
import { createBoardView } from './views/board.js';
import { createDetailView } from './views/detail.js';
import { createEpicsView } from './views/epics.js';
import { createListView } from './views/list.js';
import { createTopNav } from './views/nav.js';
import { createWsClient } from './ws.js';

/**
 * Bootstrap the SPA shell with two panels.
 * @param {HTMLElement} root_element - The container element to render into.
 */
export function bootstrap(root_element) {
  // Render nav + three route shells
  const shell = html`
    <div id="top-nav"></div>
    <section id="issues-root" class="route issues">
      <aside id="list-panel" class="panel"></aside>
    </section>
    <section id="epics-root" class="route epics" hidden></section>
    <section id="board-root" class="route board" hidden></section>
    <section id="detail-panel" class="route detail" hidden></section>
  `;
  render(shell, root_element);

  /** @type {HTMLElement|null} */
  const nav_mount = document.getElementById('top-nav');
  /** @type {HTMLElement|null} */
  const issues_root = document.getElementById('issues-root');
  /** @type {HTMLElement|null} */
  const epics_root = document.getElementById('epics-root');
  /** @type {HTMLElement|null} */
  const board_root = document.getElementById('board-root');

  /** @type {HTMLElement|null} */
  const list_mount = document.getElementById('list-panel');
  /** @type {HTMLElement|null} */
  const detail_mount = document.getElementById('detail-panel');
  if (
    list_mount &&
    nav_mount &&
    issues_root &&
    epics_root &&
    board_root &&
    detail_mount
  ) {
    const client = createWsClient();
    // Load persisted filters (status/search) from localStorage
    /** @type {{ status: 'all'|'open'|'in_progress'|'closed'|'ready', search: string }} */
    let persistedFilters = { status: 'all', search: '' };
    try {
      const raw = window.localStorage.getItem('beads-ui.filters');
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
          persistedFilters = {
            status: ['all', 'open', 'in_progress', 'closed', 'ready'].includes(
              obj.status
            )
              ? obj.status
              : 'all',
            search: typeof obj.search === 'string' ? obj.search : ''
          };
        }
      }
    } catch {
      // ignore parse errors
    }
    // Load last-view from storage
    /** @type {'issues'|'epics'|'board'} */
    let last_view = 'issues';
    try {
      const raw_view = window.localStorage.getItem('beads-ui.view');
      if (
        raw_view === 'issues' ||
        raw_view === 'epics' ||
        raw_view === 'board'
      ) {
        last_view = raw_view;
      }
    } catch {
      // ignore
    }
    const store = createStore({ filters: persistedFilters, view: last_view });
    const router = createHashRouter(store);
    router.start();
    /**
     * @param {string} type
     * @param {unknown} payload
     */
    const transport = async (type, payload) => {
      try {
        return await client.send(/** @type {any} */ (type), payload);
      } catch {
        return [];
      }
    };
    // Top navigation
    createTopNav(nav_mount, store, router);

    const issues_view = createListView(
      list_mount,
      transport,
      (hash) => {
        const id = hash.replace('#/issue/', '');
        if (id) {
          router.gotoIssue(id);
        }
      },
      store
    );
    // Persist filter changes to localStorage
    store.subscribe((s) => {
      try {
        const data = {
          status: s.filters.status,
          search: s.filters.search
        };
        window.localStorage.setItem('beads-ui.filters', JSON.stringify(data));
      } catch {
        // ignore
      }
    });
    void issues_view.load();
    const detail = createDetailView(detail_mount, transport, (hash) => {
      const id = hash.replace('#/issue/', '');
      if (id) {
        router.gotoIssue(id);
      }
    });

    // React to selectedId changes -> show detail page full-width
    store.subscribe((s) => {
      const id = s.selected_id;
      if (id) {
        void detail.load(id);
      } else {
        detail.clear();
      }
    });

    // Initial deep-link: if router set a selectedId before subscription, load it now
    const initialId = store.getState().selected_id;
    if (initialId) {
      void detail.load(initialId);
    } else {
      detail.clear();
    }

    // Refresh views on push updates
    client.on('issues-changed', () => {
      void issues_view.load();
      const id = store.getState().selected_id;
      if (id) {
        void detail.load(id);
      }
    });

    // Toggle route shells on view/detail change and persist
    const data = createDataLayer(/** @type {any} */ (transport), client.on);
    const epics_view = createEpicsView(epics_root, data, (id) =>
      router.gotoIssue(id)
    );
    const board_view = createBoardView(board_root, data, (id) =>
      router.gotoIssue(id)
    );
    // Preload epics when switching to view
    store.subscribe((s) => {
      const showDetail = Boolean(s.selected_id);
      if (issues_root && epics_root && board_root && detail_mount) {
        issues_root.hidden = showDetail || s.view !== 'issues';
        epics_root.hidden = showDetail || s.view !== 'epics';
        board_root.hidden = showDetail || s.view !== 'board';
        detail_mount.hidden = !showDetail;
      }
      if (!showDetail && s.view === 'epics') {
        void epics_view.load();
      }
      if (!showDetail && s.view === 'board') {
        void board_view.load();
      }
      try {
        window.localStorage.setItem('beads-ui.view', s.view);
      } catch {
        // ignore
      }
    });
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    // Initialize theme from saved preference or OS preference
    try {
      const saved = window.localStorage.getItem('beads-ui.theme');
      const prefersDark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial =
        saved === 'dark' || saved === 'light'
          ? saved
          : prefersDark
            ? 'dark'
            : 'light';
      document.documentElement.setAttribute('data-theme', initial);
      const sw = /** @type {HTMLInputElement|null} */ (
        document.getElementById('theme-switch')
      );
      if (sw) {
        sw.checked = initial === 'dark';
      }
    } catch {
      // ignore theme init errors
    }

    // Wire up theme switch in header
    const themeSwitch = /** @type {HTMLInputElement|null} */ (
      document.getElementById('theme-switch')
    );
    if (themeSwitch) {
      themeSwitch.addEventListener('change', () => {
        const mode = themeSwitch.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', mode);
        try {
          window.localStorage.setItem('beads-ui.theme', mode);
        } catch {
          // ignore persistence errors
        }
      });
    }

    /** @type {HTMLElement|null} */
    const app_root = document.getElementById('app');
    if (app_root) {
      bootstrap(app_root);
    }
  });
}
