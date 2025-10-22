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
    const store = createStore({ filters: { status: 'all', search: '' } });
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
