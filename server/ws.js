/**
 * @import { Server } from 'node:http'
 * @import { RawData, WebSocket } from 'ws'
 * @import { MessageType } from '../app/protocol.js'
 */
import { WebSocketServer } from 'ws';
import { runBd, runBdJson } from './bd.js';
import { isRequest, makeError, makeOk } from './protocol.js';

/**
 * Attach a WebSocket server to an existing HTTP server.
 * @param {Server} http_server
 * @param {{ path?: string, heartbeat_ms?: number }} [options]
 * @returns {{ wss: WebSocketServer, broadcast: (type: MessageType, payload?: unknown) => void }}
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
   * @param {MessageType} type
   * @param {unknown} [payload]
   */
  function broadcast(type, payload) {
    const msg = JSON.stringify({
      id: `evt-${Date.now()}`,
      ok: true,
      type,
      payload
    });
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
 * @param {RawData} data
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
      error: { code: 'bad_json', message: 'Invalid JSON' }
    };
    ws.send(JSON.stringify(reply));
    return;
  }

  if (!isRequest(json)) {
    const reply = {
      id: 'unknown',
      ok: false,
      type: 'bad-request',
      error: { code: 'bad_request', message: 'Invalid request envelope' }
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
    const { filters } = /** @type {any} */ (req.payload || {});
    // When "ready" is requested, use the dedicated bd subcommand
    if (filters && typeof filters === 'object' && filters.ready === true) {
      const res = await runBdJson(['ready', '--json']);
      if (res.code !== 0) {
        const err = makeError(req, 'bd_error', res.stderr || 'bd failed');
        ws.send(JSON.stringify(err));
        return;
      }
      ws.send(JSON.stringify(makeOk(req, res.stdoutJson)));
      return;
    }

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
    const { id } = /** @type {any} */ (req.payload);
    if (typeof id !== 'string' || id.length === 0) {
      ws.send(
        JSON.stringify(
          makeError(req, 'bad_request', 'payload.id must be a non-empty string')
        )
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

  // update-status
  if (req.type === 'update-status') {
    const { id, status } = /** @type {any} */ (req.payload);
    const allowed = new Set(['open', 'in_progress', 'closed']);
    if (
      typeof id !== 'string' ||
      id.length === 0 ||
      typeof status !== 'string' ||
      !allowed.has(status)
    ) {
      ws.send(
        JSON.stringify(
          makeError(
            req,
            'bad_request',
            "payload requires { id: string, status: 'open'|'in_progress'|'closed' }"
          )
        )
      );
      return;
    }
    const res = await runBd(['update', id, '--status', status]);
    if (res.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', res.stderr || 'bd failed'))
      );
      return;
    }
    const shown = await runBdJson(['show', id, '--json']);
    if (shown.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', shown.stderr || 'bd failed'))
      );
      return;
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)));
    return;
  }

  // update-priority
  if (req.type === 'update-priority') {
    const { id, priority } = /** @type {any} */ (req.payload);
    if (
      typeof id !== 'string' ||
      id.length === 0 ||
      typeof priority !== 'number' ||
      priority < 0 ||
      priority > 4
    ) {
      ws.send(
        JSON.stringify(
          makeError(
            req,
            'bad_request',
            'payload requires { id: string, priority: 0..4 }'
          )
        )
      );
      return;
    }
    const res = await runBd(['update', id, '--priority', String(priority)]);
    if (res.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', res.stderr || 'bd failed'))
      );
      return;
    }
    const shown = await runBdJson(['show', id, '--json']);
    if (shown.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', shown.stderr || 'bd failed'))
      );
      return;
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)));
    return;
  }

  // edit-text
  if (req.type === 'edit-text') {
    const { id, field, value } = /** @type {any} */ (req.payload);
    if (
      typeof id !== 'string' ||
      id.length === 0 ||
      (field !== 'title' &&
        field !== 'description' &&
        field !== 'acceptance') ||
      typeof value !== 'string'
    ) {
      ws.send(
        JSON.stringify(
          makeError(
            req,
            'bad_request',
            "payload requires { id: string, field: 'title'|'description'|'acceptance', value: string }"
          )
        )
      );
      return;
    }
    const flag =
      field === 'title'
        ? '--title'
        : field === 'description'
          ? '--description'
          : '--acceptance';
    const res = await runBd(['update', id, flag, value]);
    if (res.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', res.stderr || 'bd failed'))
      );
      return;
    }
    const shown = await runBdJson(['show', id, '--json']);
    if (shown.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', shown.stderr || 'bd failed'))
      );
      return;
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)));
    return;
  }

  // create-issue
  if (req.type === /** @type {any} */ ('create-issue')) {
    const { title, type, priority, description } = /** @type {any} */ (
      req.payload || {}
    );
    if (typeof title !== 'string' || title.length === 0) {
      ws.send(
        JSON.stringify(
          makeError(
            req,
            'bad_request',
            'payload requires { title: string, ... }'
          )
        )
      );
      return;
    }
    /** @type {string[]} */
    const args = ['create', title];
    if (
      typeof type === 'string' &&
      (type === 'bug' ||
        type === 'feature' ||
        type === 'task' ||
        type === 'epic' ||
        type === 'chore')
    ) {
      args.push('-t', type);
    }
    if (typeof priority === 'number' && priority >= 0 && priority <= 4) {
      args.push('-p', String(priority));
    }
    if (typeof description === 'string' && description.length > 0) {
      args.push('-d', description);
    }
    const res = await runBd(args);
    if (res.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', res.stderr || 'bd failed'))
      );
      return;
    }
    // Rely on watcher to refresh clients; reply with a minimal ack
    ws.send(JSON.stringify(makeOk(req, { created: true })));
    return;
  }

  // dep-add: payload { a: string, b: string, view_id?: string }
  if (req.type === /** @type {any} */ ('dep-add')) {
    const { a, b, view_id } = /** @type {any} */ (req.payload || {});
    if (
      typeof a !== 'string' ||
      a.length === 0 ||
      typeof b !== 'string' ||
      b.length === 0
    ) {
      ws.send(
        JSON.stringify(
          makeError(
            req,
            'bad_request',
            'payload requires { a: string, b: string }'
          )
        )
      );
      return;
    }
    const res = await runBd(['dep', 'add', a, b]);
    if (res.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', res.stderr || 'bd failed'))
      );
      return;
    }
    const id = typeof view_id === 'string' && view_id.length > 0 ? view_id : a;
    const shown = await runBdJson(['show', id, '--json']);
    if (shown.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', shown.stderr || 'bd failed'))
      );
      return;
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)));
    return;
  }

  // dep-remove: payload { a: string, b: string, view_id?: string }
  if (req.type === /** @type {any} */ ('dep-remove')) {
    const { a, b, view_id } = /** @type {any} */ (req.payload || {});
    if (
      typeof a !== 'string' ||
      a.length === 0 ||
      typeof b !== 'string' ||
      b.length === 0
    ) {
      ws.send(
        JSON.stringify(
          makeError(
            req,
            'bad_request',
            'payload requires { a: string, b: string }'
          )
        )
      );
      return;
    }
    const res = await runBd(['dep', 'remove', a, b]);
    if (res.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', res.stderr || 'bd failed'))
      );
      return;
    }
    const id = typeof view_id === 'string' && view_id.length > 0 ? view_id : a;
    const shown = await runBdJson(['show', id, '--json']);
    if (shown.code !== 0) {
      ws.send(
        JSON.stringify(makeError(req, 'bd_error', shown.stderr || 'bd failed'))
      );
      return;
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)));
    return;
  }

  // Unknown type
  const err = makeError(
    req,
    'unknown_type',
    `Unknown message type: ${req.type}`
  );
  ws.send(JSON.stringify(err));
}
