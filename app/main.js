/**
 * Bootstrap the SPA shell with two panels.
 * @param {HTMLElement} root_element - The container element to render into.
 */
export function bootstrap(root_element) {
  /** @type {string} */
  const html_value = `
    <aside id="list-panel" class="panel">
      <div class="panel__header"><strong>Issues</strong></div>
      <div class="panel__body"><p class="muted">List goes here</p></div>
    </aside>
    <section id="detail-panel" class="panel">
      <div class="panel__header"><strong>Details</strong></div>
      <div class="panel__body"><p class="muted">Select an issue to view details</p></div>
    </section>
  `;
  root_element.innerHTML = html_value;
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
