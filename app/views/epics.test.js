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

  test('sorts children by priority then updated_at', async () => {
    document.body.innerHTML = '<div id="m"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('m'));
    const data = {
      async getEpicStatus() {
        return [
          {
            epic: { id: 'UI-10', title: 'Epic Sort' },
            total_children: 3,
            closed_children: 0,
            eligible_for_close: false
          }
        ];
      },
      /** @param {string} id */
      async getIssue(id) {
        if (id === 'UI-10') {
          return {
            id: 'UI-10',
            dependents: [{ id: 'UI-11' }, { id: 'UI-12' }, { id: 'UI-13' }]
          };
        }
        if (id === 'UI-11') {
          return {
            id: 'UI-11',
            title: 'Low priority, newest within p1',
            status: 'open',
            priority: 1,
            issue_type: 'task',
            updated_at: '2025-10-22T10:00:00.000Z'
          };
        }
        if (id === 'UI-12') {
          return {
            id: 'UI-12',
            title: 'Low priority, older',
            status: 'open',
            priority: 1,
            issue_type: 'task',
            updated_at: '2025-10-20T10:00:00.000Z'
          };
        }
        return {
          id: 'UI-13',
          title: 'Higher priority number (lower precedence)',
          status: 'open',
          priority: 2,
          issue_type: 'task',
          updated_at: '2025-10-23T10:00:00.000Z'
        };
      },
      updateIssue: vi.fn()
    };
    const view = createEpicsView(mount, /** @type {any} */ (data), () => {});
    await view.load();
    const header = mount.querySelector('.epic-header');
    header?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    const rows = Array.from(mount.querySelectorAll('tr.epic-row'));
    const ids = rows.map((r) =>
      /** @type {HTMLElement} */ (
        r.querySelector('td.mono')
      )?.textContent?.trim()
    );
    expect(ids).toEqual(['#11', '#12', '#13']);
  });

  test('clicking inputs/selects inside a row does not navigate', async () => {
    document.body.innerHTML = '<div id="m"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('m'));
    const data = {
      async getEpicStatus() {
        return [
          {
            epic: { id: 'UI-20', title: 'Epic Click Guard' },
            total_children: 1,
            closed_children: 0,
            eligible_for_close: false
          }
        ];
      },
      /** @param {string} id */
      async getIssue(id) {
        if (id === 'UI-20') {
          return { id: 'UI-20', dependents: [{ id: 'UI-21' }] };
        }
        return {
          id: 'UI-21',
          title: 'Editable',
          status: 'open',
          priority: 2,
          issue_type: 'task',
          updated_at: '2025-10-21T10:00:00.000Z'
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
    header?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    // Click a select inside the row; should not navigate
    const sel = /** @type {HTMLSelectElement|null} */ (
      mount.querySelector('tr.epic-row select')
    );
    sel?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(navCalls.length).toBe(0);
  });
});
