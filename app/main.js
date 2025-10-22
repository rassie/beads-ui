import { makeRequest, nextId } from './protocol.js';
import { createDetailView } from './views/detail.js';
import { createListView } from './views/list.js';

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
    /**
     * @param {string} type
     * @param {unknown} payload
     */
    const transport = async (type, payload) => {
      if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
        return [];
      }
      const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
      return await new Promise((resolve) => {
        const ws = new WebSocket(url);
        const id = nextId();
        const req = makeRequest(/** @type {any} */ (type), payload, id);
        ws.addEventListener('open', () => ws.send(JSON.stringify(req)));
        ws.addEventListener('message', (ev) => {
          try {
            /** @type {any} */
            const msg = JSON.parse(String(ev.data));
            if (msg && msg.id === id) {
              ws.close();
              if (msg.ok) {
                resolve(msg.payload);
              } else {
                resolve([]);
              }
            }
          } catch {
            ws.close();
            resolve([]);
          }
        });
        ws.addEventListener('error', () => {
          try {
            ws.close();
          } catch {
            /* ignore */
          }
          resolve([]);
        });
      });
    };
    const view = createListView(list_mount, transport, (hash) => {
      window.location.hash = hash;
    });
    void view.load();
    if (detail_mount) {
      const detail = createDetailView(detail_mount, transport, (hash) => {
        window.location.hash = hash;
      });

      /**
       * Parse current location hash to an issue id (or null).
       * @returns {string|null}
       */
      function currentIssueId() {
        const m = /^#\/issue\/([^\s?#]+)/.exec(window.location.hash || '');
        if (m && m[1]) {
          return decodeURIComponent(m[1]);
        }
        return null;
      }

      function handleHashChange() {
        const id = currentIssueId();
        if (id) {
          void detail.load(id);
        } else {
          detail.clear();
        }
      }

      window.addEventListener('hashchange', handleHashChange);
      handleHashChange();
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
