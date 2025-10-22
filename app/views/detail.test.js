/* global NodeListOf */
import { describe, expect, test } from 'vitest';
import { createDetailView } from './detail.js';

/** @type {(map: Record<string, any>) => (type: string, payload?: unknown) => Promise<any>} */
const stubSend = (map) => async (type, payload) => {
  if (type !== 'show-issue') {
    throw new Error('Unexpected type');
  }
  const id = /** @type {any} */ (payload).id;
  return map[id] || null;
};

describe('views/detail', () => {
  test('renders fields and dependency links', async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    /** @type {any} */
    const issue = {
      id: 'UI-29',
      title: 'Issue detail view',
      description: 'Implement detail view',
      status: 'open',
      priority: 2,
      dependencies: [
        { issue_id: 'UI-29', depends_on_id: 'UI-25', type: 'blocks' },
        { issue_id: 'UI-29', depends_on_id: 'UI-27', type: 'blocks' },
      ],
      dependents: [{ issue_id: 'UI-34', depends_on_id: 'UI-29', type: 'blocks' }],
    };

    /** @type {string[]} */
    const navigations = [];
    const view = createDetailView(mount, stubSend({ 'UI-29': issue }), (hash) => {
      navigations.push(hash);
    });

    await view.load('UI-29');

    const text = mount.textContent || '';
    expect(text).toContain('UI-29');
    expect(text).toContain('Issue detail view');
    expect(text.toLowerCase()).toContain('open');
    expect(text).toContain('p2');
    expect(text).toContain('Implement detail view');

    const links = /** @type {NodeListOf<HTMLAnchorElement>} */ (mount.querySelectorAll('a'));
    const hrefs = Array.from(links).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#/issue/UI-25', '#/issue/UI-27', '#/issue/UI-34']);

    // Simulate clicking the first link, ensure navigate_fn is used
    links[0].click();
    expect(navigations[navigations.length - 1]).toBe('#/issue/UI-25');
  });

  test('shows placeholder when not found or bad payload', async () => {
    document.body.innerHTML = '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const view = createDetailView(mount, stubSend({}));

    await view.load('UI-404');
    expect((mount.textContent || '').toLowerCase()).toContain('not found');

    view.clear();
    expect((mount.textContent || '').toLowerCase()).toContain('select an issue');
  });
});
