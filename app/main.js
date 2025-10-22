import { createHashRouter } from './router.js';
import { createStore } from './state.js';
import { createDetailView } from './views/detail.js';
import { createListView } from './views/list.js';
import { createWsClient } from './ws.js';

/**
 * Bootstrap the SPA shell with two panels.
 * @param {HTMLElement} root_element - The container element to render into.
 */
export function bootstrap(root_element) {
  /** @type {string} */
  const html_value = `
    <aside id="list-panel" class="panel">
      <div class="panel__header"><strong>Issues</strong></div>
      <div class="panel__body" id="list-root"></div>
    </aside>
    <section id="detail-panel" class="panel">
      <div class="panel__header"><strong>Details</strong></div>
      <div class="panel__body" id="detail-root"><p class="muted">Select an issue to view details</p></div>
    </section>
  `;
  root_element.innerHTML = html_value;

  /** @type {HTMLElement|null} */
  const list_mount = document.getElementById('list-root');
  /** @type {HTMLElement|null} */
  const detail_mount = document.getElementById('detail-root');
  if (list_mount) {
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
    const store = createStore({ filters: persistedFilters });
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
    const view = createListView(
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
    void view.load();
    if (detail_mount) {
      const detail = createDetailView(detail_mount, transport, (hash) => {
        const id = hash.replace('#/issue/', '');
        if (id) {
          router.gotoIssue(id);
        }
      });

      // React to selectedId changes
      store.subscribe((s) => {
        const id = s.selectedId;
        if (id) {
          void detail.load(id);
        } else {
          detail.clear();
        }
      });

      // Refresh views on push updates
      client.on('issues-changed', () => {
        void view.load();
        const id = store.getState().selectedId;
        if (id) {
          void detail.load(id);
        }
      });
    }
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    /** @type {HTMLElement|null} */
    const app_root = document.getElementById('app');
    if (app_root) {
      bootstrap(app_root);
    }
  });
}
