# beads-ui

Local-first single-page web UI for the `bd` (beads) CLI issue tracker. It serves a browser app from
a local Node.js server and uses a WebSocket to list issues, view details, and edit fields. Changes
are applied by executing `bd` commands and live updates are pushed to the UI when the database
changes.

## Run Locally

Prerequisites:

- Node.js >= 18.19
- `bd` CLI on your PATH (or set `BD_BIN=/path/to/bd`)

Install and start:

```sh
npm install
npm start
```

Open http://127.0.0.1:5173 in your browser.

- The server binds to `127.0.0.1` (local-only) and exposes a WebSocket at `/ws`.
- Data flow: UI ⇄ WS ⇄ server ⇄ `bd` CLI; DB changes trigger `issues-changed` events.

## How Edits Propagate

- UI actions (edit title/description/acceptance, change status/priority, add/remove dependencies)
  send WS messages.
- The server validates the payload and runs the corresponding `bd` command.
- On success, the server returns the updated issue (or an ack for create) and the DB watcher
  broadcasts `issues-changed` so other views refresh.
- On errors, the UI rolls back the optimistic change and shows a small toast message.

## Developer Workflow

- Type check: `npm run typecheck`
- Tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`

See `docs/quickstart.md` for details and `docs/architecture.md` for the protocol and component
overview.

## Notes

- The server always binds to `127.0.0.1` for safety. Configure the port via `PORT`.
- The active beads database path is resolved consistently and watched for changes. See
  `docs/db-watching.md`.
