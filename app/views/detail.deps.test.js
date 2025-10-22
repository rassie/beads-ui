import { describe, expect, test, vi } from 'vitest';
import { createDetailView } from './detail.js';

function setupDom() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  return root;
}

describe('views/detail dependencies', () => {
  test('adds Dependencies link and re-renders', async () => {
    const mount = setupDom();
    const send = vi
      .fn()
      // initial show
      .mockResolvedValueOnce({
        id: 'UI-10',
        title: 'X',
        dependencies: [],
        dependents: []
      })
      // dep-add returns updated issue
      .mockResolvedValueOnce({
        id: 'UI-10',
        dependencies: [{ id: 'UI-2' }],
        dependents: []
      });
    const view = createDetailView(mount, /** @type {any} */ (send));
    await view.load('UI-10');

    const input = mount.querySelector('[data-testid="add-dependency"]');
    expect(input).toBeTruthy();
    /** @type {HTMLInputElement} */
    const el = /** @type {any} */ (input);
    el.value = 'UI-2';
    const addBtn = el.nextElementSibling;
    addBtn?.dispatchEvent(new window.Event('click'));

    // Next tick
    await Promise.resolve();

    // Should have called dep-add
    const calls = send.mock.calls.map((c) => c[0]);
    expect(calls.includes('dep-add')).toBe(true);
  });

  test('removes Blocks link', async () => {
    const mount = setupDom();
    const send = vi
      .fn()
      // initial show
      .mockResolvedValueOnce({
        id: 'UI-20',
        title: 'Y',
        dependencies: [],
        dependents: [{ id: 'UI-5' }]
      })
      // dep-remove returns updated issue
      .mockResolvedValueOnce({ id: 'UI-20', dependencies: [], dependents: [] });
    const view = createDetailView(mount, /** @type {any} */ (send));
    await view.load('UI-20');

    // Find the remove button next to link UI-5
    const btns = mount.querySelectorAll('button');
    const rm = Array.from(btns).find((b) =>
      b.getAttribute('aria-label')?.includes('UI-5')
    );
    expect(rm).toBeTruthy();
    rm?.dispatchEvent(new window.Event('click'));

    await Promise.resolve();
    const calls = send.mock.calls.map((c) => c[0]);
    expect(calls.includes('dep-remove')).toBe(true);
  });

  test('prevents duplicate link add', async () => {
    const mount = setupDom();
    const send = vi.fn().mockResolvedValueOnce({
      id: 'UI-30',
      dependencies: [{ id: 'UI-9' }],
      dependents: []
    });
    const view = createDetailView(mount, /** @type {any} */ (send));
    await view.load('UI-30');

    const input = mount.querySelector('[data-testid="add-dependency"]');
    const el = /** @type {HTMLInputElement} */ (/** @type {any} */ (input));
    el.value = 'UI-9';
    const addBtn = el.nextElementSibling;
    addBtn?.dispatchEvent(new window.Event('click'));

    await Promise.resolve();
    // send should not be called with dep-add
    const calls = send.mock.calls.map((c) => c[0]);
    expect(calls.includes('dep-add')).toBe(false);
  });
});
