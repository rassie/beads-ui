# beads-ui

Local‑first UI for the `bd` CLI (beads) — a fast, dependency‑aware issue
tracker.

beads-ui complements the upstream beads project by providing a single‑page web
app served from a local Node.js server. It talks to `bd` over a local WebSocket
to list issues, show details, and apply edits. All changes happen by executing
`bd` commands, and live updates flow in as the database changes on disk.

Upstream beads (CLI and docs): https://github.com/steveyegge/beads

## Features

- Issues list with inline edits, quick filters, and keyboard navigation
- Epics view grouped by epic (from `bd epic status --json`) with expandable rows
- Board view with Ready / In progress / Closed columns
- Deep links for navigation; state persists across reloads
- Live updates via FS watch + WebSocket; optimistic UI with rollbacks on error
- Dark theme toggle, saved per user
- Local CLI helper `bdui` to daemonize the server and open your browser

## Screenshots

Issues

![Issues view](media/bdui-issues.png)

Epics

![Epics view](media/bdui-epics.png)

Board

![Board view](media/bdui-board.png)

## Quickstart

Prerequisites:

- Node.js >= 22
- `bd` CLI on your PATH (or set `BD_BIN=/path/to/bd`)

Install and start:

```sh
npm install -g beads-ui
bdui start
```

See `bdui --help` for options.

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

## Developer Workflow

- Type check: `npm run typecheck`
- Tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`

See `docs/quickstart.md` for details and `docs/architecture.md` for the protocol
and component overview.
