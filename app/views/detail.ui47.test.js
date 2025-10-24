import { describe, expect, test, vi } from 'vitest';
import { createDetailView } from './detail.js';

describe('detail deps UI (UI-47)', () => {
  test('renders id, type and title for dependency items', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    /** @type {any} */
    const issue = {
      id: 'UI-100',
      title: 'Parent',
      dependencies: [
        { id: 'UI-1', issue_type: 'feature', title: 'Alpha' },
        { id: 'UI-2', issue_type: 'bug', title: 'Beta' }
      ],
      dependents: [{ id: 'UI-3', issue_type: 'task', title: 'Gamma' }]
    };

    const view = createDetailView(mount, async (type) => {
      if (type === 'show-issue') {
        return issue;
      }
      throw new Error('Unexpected');
    });

    await view.load('UI-100');

    const text = mount.textContent || '';
    expect(text).toContain('#1');
    expect(text).toContain('Alpha');
    expect(text).toContain('#3');
    expect(text).toContain('Gamma');
    const badges = mount.querySelectorAll('ul .type-badge');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  test('clicking a dependency row triggers navigation', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const navs = /** @type {string[]} */ ([]);
    const send = vi.fn().mockResolvedValue({
      id: 'UI-200',
      dependencies: [{ id: 'UI-9', issue_type: 'feature', title: 'Z' }],
      dependents: []
    });
    const view = createDetailView(mount, /** @type {any} */ (send), (hash) =>
      navs.push(hash)
    );

    await view.load('UI-200');

    const row = /** @type {HTMLLIElement} */ (mount.querySelector('ul li'));
    row.click();
    expect(navs[navs.length - 1]).toBe('#/issues?issue=UI-9');
  });

  test('add input is placed at the bottom of the section', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const send = vi
      .fn()
      .mockResolvedValue({ id: 'UI-300', dependencies: [], dependents: [] });
    const view = createDetailView(mount, /** @type {any} */ (send));
    await view.load('UI-300');

    const input = /** @type {HTMLInputElement} */ (
      mount.querySelector('[data-testid="add-dependency"]')
    );
    expect(input).toBeTruthy();
    const prev = input.parentElement?.previousElementSibling;
    // Expect the add controls to follow the list (ul)
    expect(prev && prev.tagName).toBe('UL');
  });
});
