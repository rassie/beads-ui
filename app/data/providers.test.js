import { describe, expect, test } from 'vitest';
import { createDataLayer } from './providers.js';

// Using a minimal fixture shaped like epic-status-example.json
const epicFixture = [
  {
    epic: {
      id: 'WK-1',
      title: 'Example Epic',
      description: 'Example',
      acceptance_criteria: 'Demo',
      notes: '',
      status: 'open',
      priority: 1,
      issue_type: 'epic',
      created_at: '2025-10-21T00:00:00.000Z',
      updated_at: '2025-10-21T00:00:00.000Z'
    },
    total_children: 2,
    closed_children: 1,
    eligible_for_close: false
  }
];

/**
 * @returns {{ calls: { type: string, payload: any }[], send: (type: string, payload?: any) => Promise<any> }}
 */
function makeTransportRecorder() {
  /** @type {{ type: string, payload: any }[]} */
  const calls = [];
  return {
    calls,
    /**
     * @param {string} type
     * @param {any} [payload]
     */
    async send(type, payload) {
      calls.push({ type, payload });
      // default fake payloads
      if (type === 'epic-status') {
        return [];
      }
      if (type === 'list-issues') {
        return [];
      }
      if (type === 'show-issue') {
        return { id: payload?.id || 'X' };
      }
      if (
        type === 'update-status' ||
        type === 'update-priority' ||
        type === 'edit-text' ||
        type === 'update-type' ||
        type === 'update-assignee'
      ) {
        return { id: payload?.id || 'X' };
      }
      return null;
    }
  };
}

describe('data/providers', () => {
  test('getClosed requests list-issues with status and limit=10 by default', async () => {
    const rec = makeTransportRecorder();
    const data = createDataLayer((t, p) => rec.send(t, p));
    await data.getClosed();
    const last = rec.calls[rec.calls.length - 1];
    expect(last.type).toBe('list-issues');
    expect(last.payload.filters.status).toBe('closed');
    expect(last.payload.filters.limit).toBe(10);
  });

  test('getInProgress requests list-issues with status=in_progress', async () => {
    const rec = makeTransportRecorder();
    const data = createDataLayer((t, p) => rec.send(t, p));
    await data.getInProgress();
    const last = rec.calls[rec.calls.length - 1];
    expect(last.type).toBe('list-issues');
    expect(last.payload.filters.status).toBe('in_progress');
  });

  test('getReady uses list-issues with ready:true', async () => {
    const rec = makeTransportRecorder();
    const data = createDataLayer((t, p) => rec.send(t, p));
    await data.getReady();
    const last = rec.calls[rec.calls.length - 1];
    expect(last.type).toBe('list-issues');
    expect(last.payload.filters.ready).toBe(true);
  });

  test('getEpicStatus calls epic-status and returns fixture-shaped data', async () => {
    const rec = makeTransportRecorder();
    const data = createDataLayer(async (t, p) => {
      if (t === 'epic-status') {
        rec.calls.push({ type: t, payload: p });
        return epicFixture;
      }
      return rec.send(t, p);
    });
    const res = await data.getEpicStatus();
    const last = rec.calls[rec.calls.length - 1];
    expect(last.type).toBe('epic-status');
    expect(Array.isArray(res)).toBe(true);
    // basic shape check from fixture
    // @ts-ignore
    expect(res[0].epic?.id).toBeDefined();
  });

  test('updateIssue dispatches field-specific mutations', async () => {
    const rec = makeTransportRecorder();
    const data = createDataLayer((t, p) => rec.send(t, p));
    await data.updateIssue({
      id: 'UI-1',
      title: 'X',
      acceptance: 'Y',
      status: 'in_progress',
      priority: 2,
      type: 'feature',
      assignee: 'max'
    });
    const types = rec.calls.map((c) => c.type);
    expect(types).toContain('edit-text');
    expect(types).toContain('update-status');
    expect(types).toContain('update-priority');
    expect(types).toContain('update-type');
    expect(types).toContain('update-assignee');
  });
});
