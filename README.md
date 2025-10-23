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

Verify it’s available and prints usage:

```sh
bdui --help
```

Notes:

- Requires Node.js >= 22 (enforced via `package.json`).
- Commands `start|stop|restart` are currently stubs; daemon behavior lands in a
  later issue. Use `npm start` for the server until then.

## Notes

- The server always binds to `127.0.0.1` for safety. Configure the port via
  `PORT`.
- The active beads database path is resolved consistently and watched for
  changes. See `docs/db-watching.md`.
- A dark theme is available via the header toggle. Preference is stored in
  `localStorage` under `beads-ui.theme`.
