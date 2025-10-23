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
  test('renders fields, markdown description, and dependency links', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    /** @type {any} */
    const issue = {
      id: 'UI-29',
      title: 'Issue detail view',
      description:
        '# Heading\n\nImplement detail view with a [link](https://example.com) and `code`.',
      status: 'open',
      priority: 2,
      dependencies: [{ id: 'UI-25' }, { id: 'UI-27' }],
      dependents: [{ id: 'UI-34' }]
    };

    /** @type {string[]} */
    const navigations = [];
    const view = createDetailView(
      mount,
      stubSend({ 'UI-29': issue }),
      (hash) => {
        navigations.push(hash);
      }
    );

    await view.load('UI-29');

    const headerMono = /** @type {HTMLElement|null} */ (
      mount.querySelector('.panel__header .mono')
    );
    expect(headerMono && headerMono.textContent).toBe('#29');
    const titleSpan = /** @type {HTMLSpanElement} */ (
      mount.querySelector('h2 .editable')
    );
    expect(titleSpan.textContent).toBe('Issue detail view');
    // status select + priority select exist
    const selects = mount.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(2);
    // description rendered as markdown in read mode
    const md = /** @type {HTMLDivElement} */ (mount.querySelector('.md'));
    expect(md).toBeTruthy();
    const a = /** @type {HTMLAnchorElement|null} */ (md.querySelector('a'));
    expect(a && a.getAttribute('href')).toBe('https://example.com');
    const code = md.querySelector('code');
    expect(code && code.textContent).toBe('code');

    const links = /** @type {NodeListOf<HTMLAnchorElement>} */ (
      mount.querySelectorAll('a')
    );
    const hrefs = Array.from(links)
      .map((a) => a.getAttribute('href') || '')
      .filter((h) => h.startsWith('#/issue/'));
    expect(hrefs).toEqual(['#/issue/UI-25', '#/issue/UI-27', '#/issue/UI-34']);

    // No textarea in read mode
    const descInput0 = /** @type {HTMLTextAreaElement|null} */ (
      mount.querySelector('textarea')
    );
    expect(descInput0).toBeNull();

    // Simulate clicking the first internal link, ensure navigate_fn is used
    const firstInternal = Array.from(links).find((a) =>
      (a.getAttribute('href') || '').startsWith('#/issue/')
    );
    if (!firstInternal) {
      throw new Error('No internal link found');
    }
    firstInternal.click();
    expect(navigations[navigations.length - 1]).toBe('#/issue/UI-25');
  });

  test('renders type in Properties sidebar', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    /** @type {any} */
    const issue = {
      id: 'UI-50',
      title: 'With type',
      issue_type: 'feature',
      dependencies: [],
      dependents: []
    };
    const view = createDetailView(mount, async (type) => {
      if (type === 'show-issue') {
        return issue;
      }
      throw new Error('Unexpected');
    });
    await view.load('UI-50');
    const badge = mount.querySelector('.props-card .type-badge');
    expect(badge).toBeTruthy();
    expect(badge && badge.textContent).toBe('Feature');
  });

  test('inline editing toggles for title and description', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    /** @type {any} */
    const issue = {
      id: 'UI-29',
      title: 'Issue detail view',
      description: 'Some text',
      status: 'open',
      priority: 2,
      dependencies: [],
      dependents: []
    };

    const view = createDetailView(mount, async (type, payload) => {
      if (type === 'show-issue') {
        return issue;
      }
      if (type === 'edit-text') {
        const f = /** @type {any} */ (payload).field;
        const v = /** @type {any} */ (payload).value;
        issue[f] = v;
        return issue;
      }
      throw new Error('Unexpected type');
    });

    await view.load('UI-29');

    // Title: click to edit -> input appears, Esc cancels
    const titleSpan = /** @type {HTMLSpanElement} */ (
      mount.querySelector('h2 .editable')
    );
    titleSpan.click();
    let titleInput = /** @type {HTMLInputElement} */ (
      mount.querySelector('h2 input')
    );
    expect(titleInput).toBeTruthy();
    const esc = new KeyboardEvent('keydown', { key: 'Escape' });
    titleInput.dispatchEvent(esc);
    expect(
      /** @type {HTMLInputElement|null} */ (mount.querySelector('h2 input'))
    ).toBeNull();

    // Description: click to edit -> textarea appears, Ctrl+Enter saves
    const md = /** @type {HTMLDivElement} */ (mount.querySelector('.md'));
    md.click();
    const area = /** @type {HTMLTextAreaElement} */ (
      mount.querySelector('textarea')
    );
    area.value = 'Changed';
    const key = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true });
    area.dispatchEvent(key);
    // After save, returns to read mode (allow microtask flush)
    await Promise.resolve();
    expect(
      /** @type {HTMLTextAreaElement|null} */ (mount.querySelector('textarea'))
    ).toBeNull();
  });

  test('shows placeholder when not found or bad payload', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const view = createDetailView(mount, stubSend({}));

    await view.load('UI-404');
    expect((mount.textContent || '').toLowerCase()).toContain('not found');

    view.clear();
    expect((mount.textContent || '').toLowerCase()).toContain(
      'select an issue'
    );
  });
});
