# beads-ui

Local-first single-page web UI for the `bd` (beads) CLI issue tracker. It serves
a browser app from a local Node.js server and uses a WebSocket to list issues,
view details, and edit fields. Changes are applied by executing `bd` commands
and live updates are pushed to the UI when the database changes.

## Run Locally

Prerequisites:

- Node.js >= 22
- `bd` CLI on your PATH (or set `BD_BIN=/path/to/bd`)

Install and start:

```sh
npm install
npm start
```

Open http://127.0.0.1:3000 in your browser.

- The server binds to `127.0.0.1` (local-only) and exposes a WebSocket at `/ws`.
- Data flow: UI ⇄ WS ⇄ server ⇄ `bd` CLI; DB changes trigger `issues-changed`
  events.

## Navigation & Views

The app provides a top navigation with three tabs:

- Issues — List of issues with quick filters and keyboard navigation. Clicking a
  row opens the Issue Detail panel.
- Epics — Grouped table by epic from `bd epic status --json`. Expanding an epic
  loads its dependents and shows only non‑closed issues. Inline editing supports
  title, type, priority, status, and assignee; changes persist via `bd update`.
  Within a group, rows sort by priority (ascending) and then by `updated_at`
  (descending) when available.
- Board — Three columns (Ready, In progress, Closed). Data sources:
  - Ready: `bd ready --json`, sorted by priority asc then `updated_at` desc
  - In progress: `bd list -s in_progress --json`, sorted by `updated_at` desc
  - Closed: `bd list -s closed -l 10 --json`, sorted by `updated_at` desc

Tip: The selected tab and Issues filters persist in `localStorage` so the app
restores your last context.

## How Edits Propagate

- UI actions (edit title/acceptance, change status/priority, add/remove
  dependencies) send WS messages.
- The server validates the payload and runs the corresponding `bd` command.
- On success, the server returns the updated issue (or an ack for create) and
  the DB watcher broadcasts `issues-changed` so other views refresh. Note:
  Description is currently read-only (no `bd` update flag).
- On errors, the UI rolls back the optimistic change and shows a small toast
  message.

## Developer Workflow

- Type check: `npm run typecheck`
- Tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`

See `docs/quickstart.md` for details and `docs/architecture.md` for the protocol
and component overview.

## Local CLI (`bdui`)

For a smoother developer workflow, the CLI entry `bdui` is exposed via the npm
`bin` field. This allows local linking and invoking the tool from your PATH.

Link locally (from the repo root):

```sh
npm link
```

Usage:

```sh
# Start the server as a background daemon and open the browser
bdui start

# Start without opening a browser
bdui start --no-open         # or BDUI_NO_OPEN=1 bdui start

# Stop the background server
bdui stop                    # exits with code 2 if not running

# Restart the background server
bdui restart

# Help
bdui --help
```

Behavior:

- Writes a PID file under a runtime directory and logs to `daemon.log` there.
- Prints the server URL on successful `start` (or if already running).
- Ensures only one instance is running; `start` is idempotent.

Environment variables:

- `BDUI_RUNTIME_DIR`: override runtime directory for PID/logs. Defaults to
  `$XDG_RUNTIME_DIR/beads-ui` or the system temp dir.
- `BDUI_NO_OPEN=1`: disable opening the default browser on `start`.
- `PORT`: overrides the listen port (default `3000`). The server binds to
  `127.0.0.1`.

Platform notes:

- macOS/Linux are fully supported. On Windows, the CLI uses `cmd /c start` to
  open URLs and relies on Node’s `process.kill` semantics for stopping the
  daemon.

## Notes

- The server always binds to `127.0.0.1` for safety. Configure the port via
  `PORT`.
- The active beads database path is resolved consistently and watched for
  changes. See `docs/db-watching.md`.
- A dark theme is available via the header toggle. Preference is stored in
  `localStorage` under `beads-ui.theme`.

### Troubleshooting (`bdui`)

- Logs/PID location: see the runtime dir (`$XDG_RUNTIME_DIR/beads-ui` or system
  temp). Override with `BDUI_RUNTIME_DIR`.
- Stop when not running: `bdui stop` exits with code `2`; remove a stale
  `server.pid` if present and retry.
- Port collisions: restart with a different port: `PORT=4000 bdui restart`.
