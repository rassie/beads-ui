import fs from 'node:fs';
import path from 'node:path';

/**
 * Watch `.beads/issues.jsonl` and invoke a callback after a debounce window.
 * @param {string} root_dir - Project root directory.
 * @param {(payload: { ts: number, hint?: { ids?: string[] } }) => void} on_change - Called when changes are detected.
 * @param {{ debounce_ms?: number }} [options]
 * @returns {{ close: () => void, path: string }} Handle with a close() method.
 */
export function watchIssuesJsonl(root_dir, on_change, options = {}) {
  const debounce_ms = options.debounce_ms ?? 250;
  const beads_dir = path.join(root_dir, '.beads');
  const file_name = 'issues.jsonl';
  const target_path = path.join(beads_dir, file_name);

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  const schedule = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      on_change({ ts: Date.now() });
    }, debounce_ms);
    timer.unref?.();
  };

  /** @type {fs.FSWatcher | undefined} */
  let watcher;

  try {
    watcher = fs.watch(beads_dir, { persistent: true }, (event_type, filename) => {
      if (filename && String(filename) !== file_name) {
        return;
      }
      // We react to any change/rename events on the target file.
      if (event_type === 'change' || event_type === 'rename') {
        schedule();
      }
    });
  } catch (err) {
    console.warn('watchIssuesJsonl: unable to watch directory', beads_dir, err);
  }

  return {
    path: target_path,
    close() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      watcher?.close();
    },
  };
}
