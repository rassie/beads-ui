import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi
} from 'vitest';
import { handleRestart, handleStart, handleStop } from './commands.js';
import * as daemon from './daemon.js';

// Mock browser open + readiness wait to avoid external effects and flakiness
vi.mock('./open.js', () => ({
  openUrl: async () => true,
  waitForServer: async () => {}
}));

/** @type {string} */
let tmp_runtime_dir;
/** @type {Record<string, string | undefined>} */
let prev_env;

beforeAll(() => {
  // Snapshot selected env vars to restore later
  prev_env = {
    BDUI_RUNTIME_DIR: process.env.BDUI_RUNTIME_DIR,
    PORT: process.env.PORT,
    BDUI_NO_OPEN: process.env.BDUI_NO_OPEN
  };

  tmp_runtime_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdui-it-'));
  process.env.BDUI_RUNTIME_DIR = tmp_runtime_dir;
  // Use port 0 so OS assigns an ephemeral port; URL printing still occurs
  process.env.PORT = '0';
  // Ensure default start path would not attempt to open the browser if called via CLI
  process.env.BDUI_NO_OPEN = '1';
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(async () => {
  // Ensure no stray daemon is left between tests
  const pid = daemon.readPidFile();
  if (pid && daemon.isProcessRunning(pid)) {
    await daemon.terminateProcess(pid, 2000);
  }
  daemon.removePidFile();
  // Clear the daemon log to keep noise down in CI
  try {
    fs.writeFileSync(daemon.getLogFilePath(), '', 'utf8');
  } catch {
    // ignore
  }
});

afterAll(() => {
  // Restore env
  if (prev_env.BDUI_RUNTIME_DIR === undefined) {
    delete process.env.BDUI_RUNTIME_DIR;
  } else {
    process.env.BDUI_RUNTIME_DIR = prev_env.BDUI_RUNTIME_DIR;
  }

  if (prev_env.PORT === undefined) {
    delete process.env.PORT;
  } else {
    process.env.PORT = prev_env.PORT;
  }

  if (prev_env.BDUI_NO_OPEN === undefined) {
    delete process.env.BDUI_NO_OPEN;
  } else {
    process.env.BDUI_NO_OPEN = prev_env.BDUI_NO_OPEN;
  }

  try {
    fs.rmSync(tmp_runtime_dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
  vi.mocked(console.log).mockRestore();
});

describe('commands integration', () => {
  test('start then stop returns 0 and manages PID file', async () => {
    // setup
    const print_spy = vi
      .spyOn(daemon, 'printServerUrl')
      .mockImplementation(() => {});

    // execution
    const start_code = await handleStart({ no_open: true });

    // assertion
    expect(start_code).toBe(0);
    const pid_after_start = daemon.readPidFile();
    expect(typeof pid_after_start).toBe('number');
    expect(Number(pid_after_start)).toBeGreaterThan(0);

    // execution
    const stop_code = await handleStop();

    // assertion
    expect(stop_code).toBe(0);
    const pid_after_stop = daemon.readPidFile();
    expect(pid_after_stop).toBeNull();

    print_spy.mockRestore();
  });

  test('stop returns 2 when not running', async () => {
    // execution
    const code = await handleStop();

    // assertion
    expect(code).toBe(2);
  });

  test('start is idempotent when already running', async () => {
    // setup
    await handleStart({ no_open: true });
    const start_spy = vi.spyOn(daemon, 'startDaemon');

    // execution
    const code = await handleStart({ no_open: true });

    // assertion
    expect(code).toBe(0);
    expect(start_spy).not.toHaveBeenCalled();

    // cleanup
    start_spy.mockRestore();
    await handleStop();
  });

  test('restart stops (when needed) and starts', async () => {
    // setup
    const print_spy = vi
      .spyOn(daemon, 'printServerUrl')
      .mockImplementation(() => {});

    // execution
    const code = await handleRestart();

    // assertion
    expect(code).toBe(0);
    const pid = daemon.readPidFile();
    expect(typeof pid).toBe('number');

    // cleanup
    await handleStop();
    print_spy.mockRestore();
  });
});
