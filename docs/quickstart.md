# beads-ui Quickstart

This project provides a local-first SPA for the `bd` (beads) CLI. It runs a
local HTTP + WebSocket server that serves the UI and proxies edits to the `bd`
CLI. Changes to the active beads database are pushed live to the browser.

## Prerequisites

- Node.js >= 22
- The `bd` CLI on your PATH (or set `BD_BIN=/path/to/bd`)
- An initialized beads database (see below)

## Install

```sh
npm install
```

## Run

Use the CLI to daemonize the server and open your browser:

```sh
bdui start
```

Or run in the foreground for quick debugging:

```sh
npm start
```

- Server binds to `127.0.0.1:3000` by default.
- Open http://127.0.0.1:3000 in your browser.

Environment knobs:

- `PORT` to change the listen port (default: `3000`). The server always binds to
  `127.0.0.1` for local‑only access.
- `BD_BIN` to point at a non-default `bd` binary.

## Database Resolution and Watching

The server and watcher resolve the active beads database in this order:

1. `--db <path>` injected by the server when invoking `bd` (derived from
   resolution below)
2. `BEADS_DB` environment variable, if set
3. Nearest `.beads/*.db` by walking up from the server `root_dir`
4. `~/.beads/default.db`

The watcher listens for changes to the resolved SQLite DB and broadcasts an
`issues-changed` event to all connected clients. See `docs/db-watching.md` for
details.

## Initialize a Workspace (if needed)

From your project root:

```sh
# create a workspace DB
bd init

# create a few issues
bd create "First issue" -t task -p 2 -d "Initial work"
bd create "Bug: wrong color" -t bug -p 1
```

The UI should list these after startup. Edits in the UI map to `bd update`
commands executed by the server.

## Development Workflow

- Type check: `npm run typecheck`
- Tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`

Tests cover protocol handlers, WebSocket client/server behavior, and core UI
flows (list and detail views, edits, and dependency management).

## CLI (`bdui`) Local Link

The `bdui` CLI is exposed via npm’s `bin` field for local development. To make
it available on your PATH:

```sh
npm link
```

Common commands:

```sh
bdui start           # daemonize the server and open the browser
bdui start --no-open # start without opening a browser (or set BDUI_NO_OPEN=1)
bdui stop            # stop the daemon (exit code 2 if not running)
bdui restart         # stop then start
bdui --help          # usage
```

Runtime directory and logs:

- PID and log files live under `$XDG_RUNTIME_DIR/beads-ui` or the system temp
  directory. Override with `BDUI_RUNTIME_DIR=/path`.

Environment knobs also used by `bdui`:

- `PORT` to change the listen port (default: `3000`)
- `BDUI_NO_OPEN=1` to disable auto-opening the browser on `start`
- `BDUI_RUNTIME_DIR` to set a custom runtime directory

## Protocol

The WebSocket protocol is documented in `app/protocol.md` and shared by server
and client via `server/protocol.js` re-exports.

## Troubleshooting

- If the UI shows no issues, verify a beads DB exists or run `bd init` in your
  workspace.
- To target a specific DB, set `BEADS_DB=/path/to/file.db` before `npm start`.
- If `bd` isn’t on your PATH, set `BD_BIN` to the full path.

### `bdui` specific

- Logs and PID: check the runtime dir for `daemon.log` and `server.pid`.
  - Default: `$XDG_RUNTIME_DIR/beads-ui` (Linux), otherwise your system temp
    directory (see `os.tmpdir()`).
  - Override: set `BDUI_RUNTIME_DIR=/path`.
- Stale process: if `bdui stop` reports exit code `2` but `server.pid` exists,
  remove the PID file and try again:

  ```sh
  rm "$(bdui --help >/dev/null 2>&1; echo ${BDUI_RUNTIME_DIR:-$(echo ${XDG_RUNTIME_DIR:-/tmp})/beads-ui})/server.pid" 2>/dev/null || true
  bdui stop
  ```

- Port in use: set a different port and restart:

  ```sh
  PORT=4000 bdui restart
  ```
