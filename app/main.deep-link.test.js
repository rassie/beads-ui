import { describe, expect, test, vi } from 'vitest';
// Import after mocking
import { bootstrap } from './main.js';

// Mock WS client before importing the app
const calls = [];
const issues = [
  { id: 'UI-1', title: 'One', status: 'open', priority: 1 },
  { id: 'UI-2', title: 'Two', status: 'open', priority: 2 }
];
vi.mock('./ws.js', () => ({
  createWsClient: () => ({
    /**
     * @param {string} type
     * @param {any} payload
     */
    async send(type, payload) {
      calls.push({ type, payload });
      if (type === 'list-issues') {
        return issues;
      }
      if (type === 'show-issue') {
        const id = /** @type {any} */ (payload).id;
        const it = issues.find((i) => i.id === id);
        return it || null;
      }
      return null;
    },
    on() {
      return () => {};
    },
    close() {},
    getState() {
      return 'open';
    }
  })
}));

describe('deep link on initial load (UI-44)', () => {
  test('loads detail and highlights list item when hash includes issue id', async () => {
    window.location.hash = '#/issue/UI-2';
    document.body.innerHTML = '<main id="app"></main>';
    const root = /** @type {HTMLElement} */ (document.getElementById('app'));

    bootstrap(root);

    // Allow async loads to complete
    await Promise.resolve();
    await Promise.resolve();

    const detailId = /** @type {HTMLElement} */ (
      document.querySelector('#detail-panel .detail-title .detail-id')
    );
    expect(detailId && detailId.textContent).toBe('#2');

    const list = /** @type {HTMLElement} */ (
      document.getElementById('list-root')
    );
    const selected = /** @type {HTMLElement|null} */ (
      list.querySelector('tr.issue-row.selected')
    );
    expect(selected && selected.getAttribute('data-issue-id')).toBe('UI-2');
  });
});
