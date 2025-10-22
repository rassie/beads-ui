import { describe, expect, test, vi } from 'vitest';
import { runBdJson } from './bd.js';
import { handleMessage } from './ws.js';

vi.mock('./bd.js', () => ({ runBdJson: vi.fn() }));

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

describe('ws handlers: list/show', () => {
  test('list-issues forwards payload from bd', async () => {
    const mocked = /** @type {import('vitest').Mock} */ (runBdJson);
    mocked.mockResolvedValueOnce({ code: 0, stdoutJson: [{ id: 'UI-1' }] });
    const ws = makeStubSocket();
    const req = { id: 'r1', type: 'list-issues', payload: { filters: { status: 'open' } } };
    await handleMessage(/** @type {any} */ (ws), Buffer.from(JSON.stringify(req)));
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]);
    expect(obj.ok).toBe(true);
    expect(Array.isArray(obj.payload)).toBe(true);
  });

  test('show-issue returns error on missing id', async () => {
    const ws = makeStubSocket();
    const req = { id: 'r2', type: 'show-issue', payload: {} };
    await handleMessage(/** @type {any} */ (ws), Buffer.from(JSON.stringify(req)));
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]);
    expect(obj.ok).toBe(false);
    expect(obj.error.code).toBe('bad_request');
  });

  test('show-issue forwards bd JSON on success', async () => {
    const mocked = /** @type {import('vitest').Mock} */ (runBdJson);
    mocked.mockResolvedValueOnce({ code: 0, stdoutJson: { id: 'UI-9', title: 'X' } });
    const ws = makeStubSocket();
    const req = { id: 'r3', type: 'show-issue', payload: { id: 'UI-9' } };
    await handleMessage(/** @type {any} */ (ws), Buffer.from(JSON.stringify(req)));
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]);
    expect(obj.ok).toBe(true);
    expect(obj.payload.id).toBe('UI-9');
  });

  test('bd error propagates as bd_error reply', async () => {
    const mocked = /** @type {import('vitest').Mock} */ (runBdJson);
    mocked.mockResolvedValueOnce({ code: 1, stderr: 'boom' });
    const ws = makeStubSocket();
    const req = { id: 'r4', type: 'list-issues', payload: {} };
    await handleMessage(/** @type {any} */ (ws), Buffer.from(JSON.stringify(req)));
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]);
    expect(obj.ok).toBe(false);
    expect(obj.error.code).toBe('bd_error');
  });
});
