import { spawn } from 'node:child_process';
import http from 'node:http';

/**
 * Compute a platform-specific command to open a URL in the default browser.
 *
 * @param {string} url
 * @param {string} platform
 * @returns {{ cmd: string, args: string[] }}
 */
export function computeOpenCommand(url, platform) {
  if (platform === 'darwin') {
    return { cmd: 'open', args: [url] };
  }
  if (platform === 'win32') {
    // Use `start` via cmd.exe to open URLs
    return { cmd: 'cmd', args: ['/c', 'start', '', url] };
  }
  // Assume Linux/other Unix with xdg-open
  return { cmd: 'xdg-open', args: [url] };
}

/**
 * Open the given URL in the default browser. Best-effort; resolves true on spawn success.
 *
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export async function openUrl(url) {
  const { cmd, args } = computeOpenCommand(url, process.platform);
  try {
    const child = spawn(cmd, args, {
      stdio: 'ignore',
      detached: false
    });
    // If spawn succeeded and pid is present, consider it a success
    return typeof child.pid === 'number' && child.pid > 0;
  } catch {
    return false;
  }
}

/**
 * Wait until the server at the URL accepts a connection, with a brief retry.
 * Does not throw; returns when either a connection was accepted or timeout elapsed.
 *
 * @param {string} url
 * @param {number} total_timeout_ms
 * @returns {Promise<void>}
 */
export async function waitForServer(url, total_timeout_ms = 600) {
  const deadline = Date.now() + total_timeout_ms;

  // Attempt one GET; if it fails, wait and try once more within the deadline
  const tryOnce = () =>
    new Promise((resolve) => {
      let done = false;
      const req = http.get(url, (res) => {
        // Any response implies the server is accepting connections
        if (!done) {
          done = true;
          res.resume();
          resolve(undefined);
        }
      });
      req.on('error', () => {
        if (!done) {
          done = true;
          resolve(undefined);
        }
      });
      req.setTimeout(200, () => {
        try {
          req.destroy();
        } catch {
          void 0;
        }
        if (!done) {
          done = true;
          resolve(undefined);
        }
      });
    });

  await tryOnce();

  if (Date.now() < deadline) {
    const remaining = Math.max(0, deadline - Date.now());
    await sleep(remaining);
  }
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
