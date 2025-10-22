import { describe, expect, test, vi } from 'vitest';
import { runBd, runBdJson } from './bd.js';
import { handleMessage } from './ws.js';

vi.mock('./bd.js', () => ({ runBdJson: vi.fn(), runBd: vi.fn() }));

function makeStubSocket() {
  return {
    sent: /** @type {string[]} */ ([]),
    readyState: 1,
    OPEN: 1,
    /** @param {string} msg */
    send(msg) {
      this.sent.push(String(msg));
    },
  };
}

describe('ws mutation handlers', () => {
  test('update-status validates and returns updated issue', async () => {
    const mRun = /** @type {import('vitest').Mock} */ (runBd);
    const mJson = /** @type {import('vitest').Mock} */ (runBdJson);
    mRun.mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' });
    mJson.mockResolvedValueOnce({ code: 0, stdoutJson: { id: 'UI-7', status: 'in_progress' } });
    const ws = makeStubSocket();
    const req = { id: 'r1', type: 'update-status', payload: { id: 'UI-7', status: 'in_progress' } };
    await handleMessage(/** @type {any} */ (ws), Buffer.from(JSON.stringify(req)));
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]);
    expect(obj.ok).toBe(true);
    expect(obj.payload.status).toBe('in_progress');
  });

  test('update-status invalid payload yields bad_request', async () => {
    const ws = makeStubSocket();
    const req = { id: 'r2', type: 'update-status', payload: { id: 'UI-7', status: 'bogus' } };
    await handleMessage(/** @type {any} */ (ws), Buffer.from(JSON.stringify(req)));
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]);
    expect(obj.ok).toBe(false);
    expect(obj.error.code).toBe('bad_request');
  });

  test('update-priority success path', async () => {
    const mRun = /** @type {import('vitest').Mock} */ (runBd);
    const mJson = /** @type {import('vitest').Mock} */ (runBdJson);
    mRun.mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' });
    mJson.mockResolvedValueOnce({ code: 0, stdoutJson: { id: 'UI-7', priority: 1 } });
    const ws = makeStubSocket();
    const req = { id: 'r3', type: 'update-priority', payload: { id: 'UI-7', priority: 1 } };
    await handleMessage(/** @type {any} */ (ws), Buffer.from(JSON.stringify(req)));
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]);
    expect(obj.ok).toBe(true);
    expect(obj.payload.priority).toBe(1);
  });

  test('edit-text title success', async () => {
    const mRun = /** @type {import('vitest').Mock} */ (runBd);
    const mJson = /** @type {import('vitest').Mock} */ (runBdJson);
    mRun.mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' });
    mJson.mockResolvedValueOnce({ code: 0, stdoutJson: { id: 'UI-7', title: 'New' } });
    const ws = makeStubSocket();
    const req = {
      id: 'r4',
      type: 'edit-text',
      payload: { id: 'UI-7', field: 'title', value: 'New' },
    };
    await handleMessage(/** @type {any} */ (ws), Buffer.from(JSON.stringify(req)));
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]);
    expect(obj.ok).toBe(true);
    expect(obj.payload.title).toBe('New');
  });
});
