import { describe, expect, test } from 'vitest';
import { createListView } from './list.js';

/** @type {(expected: any[]) => (type: string, payload?: unknown) => Promise<any[]>} */
const stubSend = (expected) => async (type) => {
  if (type !== 'list-issues') {
    throw new Error('Unexpected type');
  }
  return expected;
};

describe('views/list', () => {
  test('renders issues and navigates on click', async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const issues = [
      {
        id: 'UI-1',
        title: 'One',
        status: 'open',
        priority: 1,
        issue_type: 'task'
      },
      {
        id: 'UI-2',
        title: 'Two',
        status: 'closed',
        priority: 2,
        issue_type: 'bug'
      }
    ];
    const view = createListView(mount, stubSend(issues), (hash) => {
      window.location.hash = hash;
    });
    await view.load();
    const items = mount.querySelectorAll('li');
    expect(items.length).toBe(2);

    // badge present
    const badges = mount.querySelectorAll('.type-badge');
    expect(badges.length).toBeGreaterThanOrEqual(2);

    const first = /** @type {HTMLElement} */ (items[0]);
    first.click();
    expect(window.location.hash).toBe('#/issue/UI-1');
  });

  test('filters by status and search', async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const issues = [
      { id: 'UI-1', title: 'Alpha', status: 'open', priority: 1 },
      { id: 'UI-2', title: 'Beta', status: 'in_progress', priority: 2 },
      { id: 'UI-3', title: 'Gamma', status: 'closed', priority: 3 }
    ];
    const view = createListView(mount, stubSend(issues));
    await view.load();
    const select = /** @type {HTMLSelectElement} */ (
      mount.querySelector('select')
    );
    const input = /** @type {HTMLInputElement} */ (
      mount.querySelector('input[type="search"]')
    );

    // Filter by status
    select.value = 'open';
    select.dispatchEvent(new Event('change'));
    await Promise.resolve();
    expect(mount.querySelectorAll('li').length).toBe(1);

    // Search filters further
    select.value = 'all';
    select.dispatchEvent(new Event('change'));
    input.value = 'ga';
    input.dispatchEvent(new Event('input'));
    const visible = Array.from(mount.querySelectorAll('li')).map(
      (el) => el.textContent || ''
    );
    expect(visible.length).toBe(1);
    expect(visible[0].toLowerCase()).toContain('gamma');
  });

  test('ready filter via select triggers backend reload', async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    const allIssues = [
      { id: 'UI-1', title: 'One', status: 'open', priority: 1 },
      { id: 'UI-2', title: 'Two', status: 'open', priority: 2 }
    ];
    const readyIssues = [
      { id: 'UI-2', title: 'Two', status: 'open', priority: 2 }
    ];

    /** @type {{ calls: any[] }} */
    const spy = { calls: [] };
    /** @type {(type: string, payload?: unknown) => Promise<any[]>} */
    const send = async (type, payload) => {
      spy.calls.push({ type, payload });
      const p = /** @type {any} */ (payload);
      if (p && p.filters && p.filters.ready === true) {
        return readyIssues;
      }
      return allIssues;
    };

    const view = createListView(mount, send);
    await view.load();
    expect(mount.querySelectorAll('li').length).toBe(2);

    const select = /** @type {HTMLSelectElement} */ (
      mount.querySelector('select')
    );
    select.value = 'ready';
    select.dispatchEvent(new Event('change'));
    // Await a microtask to allow load to complete in jsdom
    await Promise.resolve();

    // A call should include filters.ready = true
    const has_ready = spy.calls.some(
      (c) =>
        c.type === 'list-issues' &&
        c.payload &&
        c.payload.filters &&
        c.payload.filters.ready === true
    );
    expect(has_ready).toBe(true);
    expect(mount.querySelectorAll('li').length).toBe(1);
  });
});
