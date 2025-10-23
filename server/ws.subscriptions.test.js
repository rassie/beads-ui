import { createServer } from 'node:http';
import { describe, expect, test, vi } from 'vitest';
import { runBdJson } from './bd.js';
import { attachWsServer, handleMessage, notifyIssuesChanged } from './ws.js';

vi.mock('./bd.js', () => ({ runBdJson: vi.fn(), runBd: vi.fn() }));

describe('ws subscriptions + targeted fanout', () => {
  test('subscribe-updates ack and targeted issues-changed by show id', async () => {
    const mJson = /** @type {import('vitest').Mock} */ (runBdJson);
    // show-issue → return object with id
    mJson.mockImplementation(async (args) => {
      if (Array.isArray(args) && args[0] === 'show') {
        return { code: 0, stdoutJson: { id: String(args[1]), status: 'open' } };
      }
      return { code: 0, stdoutJson: [] };
    });

    // Create an http server object but do not listen; just to satisfy attachWsServer
    const server = createServer();
    const { wss } = attachWsServer(server, {
      path: '/ws',
      heartbeat_ms: 10000
    });

    // Create two stub sockets and register them as connected clients
    const a = {
      sent: /** @type {string[]} */ ([]),
      readyState: 1,
      OPEN: 1,
      /** @param {string} msg */
      send(msg) {
        this.sent.push(String(msg));
      }
    };
    const b = {
      sent: /** @type {string[]} */ ([]),
      readyState: 1,
      OPEN: 1,
      /** @param {string} msg */
      send(msg) {
        this.sent.push(String(msg));
      }
    };
    wss.clients.add(/** @type {any} */ (a));
    wss.clients.add(/** @type {any} */ (b));

    // Subscribe both and set show-issue for A
    await handleMessage(
      /** @type {any} */ (a),
      Buffer.from(JSON.stringify({ id: 's1', type: 'subscribe-updates' }))
    );
    await handleMessage(
      /** @type {any} */ (b),
      Buffer.from(JSON.stringify({ id: 's2', type: 'subscribe-updates' }))
    );
    await handleMessage(
      /** @type {any} */ (a),
      Buffer.from(
        JSON.stringify({
          id: 'q1',
          type: 'show-issue',
          payload: { id: 'UI-1' }
        })
      )
    );

    // Now emit a targeted change for UI-1
    notifyIssuesChanged(
      { hint: { ids: ['UI-1'] } },
      { issue: { id: 'UI-1', status: 'open' } }
    );

    const aHas = a.sent.some((m) => {
      try {
        const o = JSON.parse(m);
        return o && o.type === 'issues-changed';
      } catch {
        return false;
      }
    });
    const bHas = b.sent.some((m) => {
      try {
        const o = JSON.parse(m);
        return o && o.type === 'issues-changed';
      } catch {
        return false;
      }
    });

    expect(aHas).toBe(true);
    expect(bHas).toBe(false);
  });

  test('subscribe-updates handler replies ok for bare ws', async () => {
    const ws = {
      sent: /** @type {string[]} */ ([]),
      readyState: 1,
      OPEN: 1,
      /** @param {string} msg */
      send(msg) {
        this.sent.push(String(msg));
      }
    };
    const req = { id: 'sub1', type: 'subscribe-updates', payload: {} };
    await handleMessage(
      /** @type {any} */ (ws),
      Buffer.from(JSON.stringify(req))
    );
    const last = ws.sent[ws.sent.length - 1];
    const obj = JSON.parse(last);
    expect(obj.ok).toBe(true);
    expect(obj.type).toBe('subscribe-updates');
    expect(obj.payload && obj.payload.subscribed).toBe(true);
  });
});
