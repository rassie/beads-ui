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

describe('views/detail acceptance + notes', () => {
  test('renders acceptance from acceptance_criteria and notes markdown', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    /** @type {any} */
    const issue = {
      id: 'UI-71',
      title: 'Has acceptance + notes',
      acceptance_criteria: '- step A\n- step B',
      notes: 'Plain note text',
      status: 'open',
      priority: 2
    };

    const view = createDetailView(mount, stubSend({ 'UI-71': issue }));
    await view.load('UI-71');

    const accTitle = mount.querySelector('.acceptance .props-card__title');
    expect(accTitle && accTitle.textContent).toBe('Acceptance');
    const accMd = mount.querySelector('.acceptance .md');
    expect(accMd && (accMd.textContent || '').toLowerCase()).toContain(
      'step a'
    );

    const notesTitle = mount.querySelector('.notes .props-card__title');
    expect(notesTitle && notesTitle.textContent).toBe('Notes');
    const notesMd = mount.querySelector('.notes .md');
    expect(notesMd && (notesMd.textContent || '')).toContain('Plain note text');
  });

  test('gates headings when acceptance and notes are empty', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    /** @type {any} */
    const issue = {
      id: 'UI-72',
      title: 'No acceptance/notes',
      acceptance_criteria: '',
      notes: '',
      status: 'open',
      priority: 2
    };

    const view = createDetailView(mount, stubSend({ 'UI-72': issue }));
    await view.load('UI-72');

    // Headings should not be present
    expect(mount.querySelector('.acceptance .props-card__title')).toBeNull();
    expect(mount.querySelector('.notes .props-card__title')).toBeNull();
  });
});
