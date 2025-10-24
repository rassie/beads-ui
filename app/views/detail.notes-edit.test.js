import { describe, expect, test } from 'vitest';
import { createDetailView } from './detail.js';

describe('views/detail notes edit', () => {
  test('enables editing, saves, and persists notes', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    /** @type {any} */
    const issue = {
      id: 'UI-117',
      title: 'Notes editable',
      description: '',
      notes: '',
      status: 'open',
      priority: 2
    };

    const view = createDetailView(mount, async (type, payload) => {
      if (type === 'show-issue') {
        return issue;
      }
      if (type === 'edit-text') {
        // Expect notes field update
        const f = /** @type {any} */ (payload).field;
        const v = /** @type {any} */ (payload).value;
        expect(f).toBe('notes');
        issue[f] = v;
        return issue;
      }
      throw new Error('Unexpected type: ' + type);
    });

    await view.load('UI-117');

    // Placeholder visible when empty
    const placeholder = mount.querySelector('.notes .muted');
    expect(placeholder && (placeholder.textContent || '')).toContain(
      'Add notes'
    );

    // Enter edit mode by clicking editable block
    const editable = /** @type {HTMLDivElement} */ (
      mount.querySelector('.notes .editable')
    );
    editable.click();

    const ta = /** @type {HTMLTextAreaElement} */ (
      mount.querySelector('.notes textarea')
    );
    expect(ta).toBeTruthy();
    ta.value = 'New notes text';

    // Save via Ctrl+Enter
    const key = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true });
    ta.dispatchEvent(key);
    await Promise.resolve();

    // Back to read mode with markdown rendering
    const md = /** @type {HTMLDivElement} */ (
      mount.querySelector('.notes .md')
    );
    expect(md && (md.textContent || '')).toContain('New notes text');
  });
});
