# beads-ui Quickstart

This project provides a local-first SPA for the `bd` (beads) CLI. It runs a local HTTP + WebSocket
server that serves the UI and proxies edits to the `bd` CLI. Changes to the active beads database
are pushed live to the browser.

## Prerequisites

- Node.js >= 18.19
- The `bd` CLI on your PATH (or set `BD_BIN=/path/to/bd`)
- An initialized beads database (see below)

## Install

```sh
npm install
```

## Run

```sh
npm start
```

- Server binds to `127.0.0.1:5173` by default.
- Open http://127.0.0.1:5173 in your browser.

Environment knobs:

- `HOST` and `PORT` to change bind address or port (defaults: `127.0.0.1`, `5173`).
- `BD_BIN` to point at a non-default `bd` binary.

## Database Resolution and Watching

The server and watcher resolve the active beads database in this order:

1. `--db <path>` injected by the server when invoking `bd` (derived from resolution below)
2. `BEADS_DB` environment variable, if set
3. Nearest `.beads/*.db` by walking up from the server `root_dir`
4. `~/.beads/default.db`

The watcher listens for changes to the resolved SQLite DB and broadcasts an `issues-changed` event
to all connected clients. See `docs/db-watching.md` for details.

## Initialize a Workspace (if needed)

From your project root:

```sh
# create a workspace DB
bd init

# create a few issues
bd create "First issue" -t task -p 2 -d "Initial work"
bd create "Bug: wrong color" -t bug -p 1
```

The UI should list these after startup. Edits in the UI map to `bd update` commands executed by the
server.

## Development Workflow

- Type check: `npm run typecheck`
- Tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`

Tests cover protocol handlers, WebSocket client/server behavior, and core UI flows (list and detail
views, edits, and dependency management).

## Protocol

The WebSocket protocol is documented in `app/protocol.md` and shared by server and client via
`server/protocol.js` re-exports.

## Troubleshooting

- If the UI shows no issues, verify a beads DB exists or run `bd init` in your workspace.
- To target a specific DB, set `BEADS_DB=/path/to/file.db` before `npm start`.
- If `bd` isn’t on your PATH, set `BD_BIN` to the full path.
