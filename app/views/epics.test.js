import { describe, expect, test, vi } from 'vitest';
import { createEpicsView } from './epics.js';

describe('views/epics', () => {
  test('loads groups and expands to show non-closed children, navigates on click', async () => {
    document.body.innerHTML = '<div id="m"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('m'));
    const data = {
      async getEpicStatus() {
        return [
          {
            epic: { id: 'UI-1', title: 'Epic One' },
            total_children: 2,
            closed_children: 1,
            eligible_for_close: false
          }
        ];
      },
      /** @param {string} id */
      async getIssue(id) {
        if (id === 'UI-1') {
          return { id: 'UI-1', dependents: [{ id: 'UI-2' }, { id: 'UI-3' }] };
        }
        if (id === 'UI-2') {
          return {
            id: 'UI-2',
            title: 'Alpha',
            status: 'open',
            priority: 1,
            issue_type: 'task'
          };
        }
        return {
          id: 'UI-3',
          title: 'Beta',
          status: 'closed',
          priority: 2,
          issue_type: 'task'
        };
      },
      updateIssue: vi.fn()
    };
    /** @type {string[]} */
    const navCalls = [];
    const view = createEpicsView(mount, /** @type {any} */ (data), (id) =>
      navCalls.push(id)
    );
    await view.load();
    const header = mount.querySelector('.epic-header');
    expect(header).not.toBeNull();
    header?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Wait a tick for async child loads
    await new Promise((r) => setTimeout(r, 0));
    // After expansion, only non-closed child should be present
    const rows = mount.querySelectorAll('tr.epic-row');
    expect(rows.length).toBe(1);
    rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(navCalls[0]).toBe('UI-2');
  });
});
