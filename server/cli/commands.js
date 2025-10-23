import {
  isProcessRunning,
  printServerUrl,
  readPidFile,
  removePidFile,
  startDaemon,
  terminateProcess
} from './daemon.js';

/**
 * Handle `start` command. Idempotent when already running.
 * - Spawns a detached server process, writes PID file, returns 0.
 * - If already running (PID file present and process alive), prints URL and returns 0.
 * @returns {Promise<number>} Exit code (0 on success)
 */
export async function handleStart() {
  const existing_pid = readPidFile();
  if (existing_pid && isProcessRunning(existing_pid)) {
    printServerUrl();
    return 0;
  }
  if (existing_pid && !isProcessRunning(existing_pid)) {
    // stale PID file
    removePidFile();
  }

  const started = startDaemon();
  if (started && started.pid > 0) {
    printServerUrl();
    return 0;
  }

  return 1;
}

/**
 * Handle `stop` command.
 * - Sends SIGTERM and waits for exit (with SIGKILL fallback), removes PID file.
 * - Returns 2 if not running.
 * @returns {Promise<number>} Exit code
 */
export async function handleStop() {
  const existing_pid = readPidFile();
  if (!existing_pid) {
    return 2;
  }

  if (!isProcessRunning(existing_pid)) {
    // stale PID file
    removePidFile();
    return 2;
  }

  const terminated = await terminateProcess(existing_pid, 5000);
  if (terminated) {
    removePidFile();
    return 0;
  }

  // Not terminated within timeout
  return 1;
}

/**
 * Handle `restart` command: stop (ignore not-running) then start.
 * @returns {Promise<number>} Exit code (0 on success)
 */
export async function handleRestart() {
  const stop_code = await handleStop();
  // 0 = stopped, 2 = not running; both are acceptable to proceed
  if (stop_code !== 0 && stop_code !== 2) {
    return 1;
  }
  const start_code = await handleStart();
  return start_code === 0 ? 0 : 1;
}
