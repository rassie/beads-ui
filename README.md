<h1 align="center">
  Beads UI
</h1>
<p align="center">
  <b>Local‑first UI for the <code>bd</code> CLI – <a href="https://github.com/steveyegge/beads">Beads</a></b>
</p>
<div align="center">
  <a href="https://www.npmjs.com/package/beads-ui"><img src="https://img.shields.io/npm/v/beads-ui.svg" alt="npm Version"></a>
  <a href="https://semver.org"><img src="https://img.shields.io/:semver-%E2%9C%93-blue.svg" alt="SemVer"></a>
  <a href="https://github.com/mantoni/beads-ui/actions/worflows/ci.yml"><img src="https://github.com/mantoni/eslint_d.js/actions/workflows/ci.yml/badge.svg" alt="Build Status"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/eslint_d.svg" alt="MIT License"></a>
  <br>
  <br>
</div>

## Features

- ✨ **Zero setup** – just run `bdui start`
- 🎨 **Beautiful design** – Responsive and dark mode support
- ⌨️ **Keyboard navigation** – Navigate and edit without touching the mouse
- ⚡ **Live updates** – Monitors the beads database for changes
- 🔎 **Issues view** – Filter and search issues, edit inline
- ⛰️ **Epics view** – Show progress per epic, expand rows, edit inline
- 🏂 **Board view** – Open / Blocked / Ready / In progress / Closed columns

## Setup

```sh
npm i -g beads-ui
bdui start --open
```

See `bdui --help` for options.

## Screenshots

**Issues**

![Issues view](https://github.com/mantoni/beads-ui/raw/main/media/bdui-issues.png)

**Epics**

![Epics view](https://github.com/mantoni/beads-ui/raw/main/media/bdui-epics.png)

**Board**

![Board view](https://github.com/mantoni/beads-ui/raw/main/media/bdui-board.png)

## Environment variables

- `BD_BIN`: path to the `bd` binary.
- `BDUI_RUNTIME_DIR`: override runtime directory for PID/logs. Defaults to
  `$XDG_RUNTIME_DIR/beads-ui` or the system temp dir.
- `BDUI_NO_OPEN=1`: disable opening the default browser on `start`. Note:
  Opening the browser is disabled by default; use `--open` to explicitly launch
  the browser, which overrides this env var.
- `PORT`: overrides the listen port (default `3000`). The server binds to
  `127.0.0.1`.

## Platform notes

- macOS/Linux are fully supported. On Windows, the CLI uses `cmd /c start` to
  open URLs and relies on Node’s `process.kill` semantics for stopping the
  daemon.

## Developer Workflow

- 📦 Make sure you have `beads-mcp` installed.
- 🤖 Ask your agent of choice. It will know.

## License

MIT
