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
      { id: 'UI-1', title: 'One', status: 'open', priority: 1 },
      { id: 'UI-2', title: 'Two', status: 'closed', priority: 2 },
    ];
    const view = createListView(mount, stubSend(issues), (hash) => {
      window.location.hash = hash;
    });
    await view.load();
    const items = mount.querySelectorAll('li');
    expect(items.length).toBe(2);

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
      { id: 'UI-3', title: 'Gamma', status: 'closed', priority: 3 },
    ];
    const view = createListView(mount, stubSend(issues));
    await view.load();
    const select = /** @type {HTMLSelectElement} */ (mount.querySelector('select'));
    const input = /** @type {HTMLInputElement} */ (mount.querySelector('input[type="search"]'));

    // Filter by status
    select.value = 'open';
    select.dispatchEvent(new Event('change'));
    expect(mount.querySelectorAll('li').length).toBe(1);

    // Search filters further
    select.value = 'all';
    select.dispatchEvent(new Event('change'));
    input.value = 'ga';
    input.dispatchEvent(new Event('input'));
    const visible = Array.from(mount.querySelectorAll('li')).map((el) => el.textContent || '');
    expect(visible.length).toBe(1);
    expect(visible[0].toLowerCase()).toContain('gamma');
  });
});
