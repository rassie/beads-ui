import { WebSocketServer } from 'ws';
import { runBdJson } from './bd.js';
import { isRequest, makeError, makeOk } from './protocol.js';

/** @typedef {import('ws').WebSocket} WebSocket */
/** @typedef {import('ws').WebSocketServer} WebSocketServerType */

/**
 * Attach a WebSocket server to an existing HTTP server.
 * @param {import('node:http').Server} http_server
 * @param {{ path?: string, heartbeat_ms?: number }} [options]
 * @returns {{ wss: WebSocketServerType, broadcast: (type: import('../app/protocol.js').MessageType, payload?: unknown) => void }}
 */
export function attachWsServer(http_server, options = {}) {
  const path = options.path || '/ws';
  const heartbeat_ms = options.heartbeat_ms ?? 30000;

  const wss = new WebSocketServer({ server: http_server, path });

  // Heartbeat: track if client answered the last ping
  wss.on('connection', (ws) => {
    // @ts-expect-error add marker property
    ws.isAlive = true;

    ws.on('pong', () => {
      // @ts-expect-error marker
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      handleMessage(ws, data);
    });
  });

  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      // @ts-expect-error marker
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      // @ts-expect-error marker
      ws.isAlive = false;
      ws.ping();
    }
  }, heartbeat_ms);

  interval.unref?.();

  wss.on('close', () => {
    clearInterval(interval);
  });

  /**
   * Broadcast a server-initiated event to all open clients.
   * @param {import('../app/protocol.js').MessageType} type
   * @param {unknown} [payload]
   */
  function broadcast(type, payload) {
    const msg = JSON.stringify({ id: `evt-${Date.now()}`, ok: true, type, payload });
    for (const ws of wss.clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(msg);
      }
    }
  }

  return { wss, broadcast };
}

/**
 * Handle an incoming message frame and respond to the same socket.
 * @param {WebSocket} ws
 * @param {import('ws').RawData} data
 */
export async function handleMessage(ws, data) {
  /** @type {unknown} */
  let json;
  try {
    json = JSON.parse(data.toString());
  } catch {
    const reply = {
      id: 'unknown',
      ok: false,
      type: 'bad-json',
      error: { code: 'bad_json', message: 'Invalid JSON' },
    };
    ws.send(JSON.stringify(reply));
    return;
  }

  if (!isRequest(json)) {
    const reply = {
      id: 'unknown',
      ok: false,
      type: 'bad-request',
      error: { code: 'bad_request', message: 'Invalid request envelope' },
    };
    ws.send(JSON.stringify(reply));
    return;
  }

  const req = json;

  // Dispatch known types here as we implement them. For now, only a ping utility.
  if (req.type === /** @type {any} */ ('ping')) {
    ws.send(JSON.stringify(makeOk(req, { ts: Date.now() })));
    return;
  }

  // list-issues
  if (req.type === 'list-issues') {
    const filters =
      req.payload && typeof req.payload === 'object'
        ? /** @type {any} */ (req.payload).filters
        : undefined;
    /** @type {string[]} */
    const args = ['list', '--json'];
    if (filters && typeof filters === 'object') {
      if (typeof filters.status === 'string') {
        args.push('--status', filters.status);
      }
      if (typeof filters.priority === 'number') {
        args.push('--priority', String(filters.priority));
      }
    }
    const res = await runBdJson(args);
    if (res.code !== 0) {
      const err = makeError(req, 'bd_error', res.stderr || 'bd failed');
      ws.send(JSON.stringify(err));
      return;
    }
    ws.send(JSON.stringify(makeOk(req, res.stdoutJson)));
    return;
  }

  // show-issue
  if (req.type === 'show-issue') {
    const id = /** @type {any} */ (req.payload)?.id;
    if (typeof id !== 'string' || id.length === 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bad_request', 'payload.id must be a non-empty string'))
      );
      return;
    }
    const res = await runBdJson(['show', id, '--json']);
    if (res.code !== 0) {
      const err = makeError(req, 'bd_error', res.stderr || 'bd failed');
      ws.send(JSON.stringify(err));
      return;
    }
    ws.send(JSON.stringify(makeOk(req, res.stdoutJson)));
    return;
  }

  // Unknown type
  const err = makeError(req, 'unknown_type', `Unknown message type: ${req.type}`);
  ws.send(JSON.stringify(err));
}
