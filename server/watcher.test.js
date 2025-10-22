import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { watchIssuesJsonl } from './watcher.js';

/** @type {{ dir: string, cb: (event: string, filename?: string) => void, w: { close: () => void } }[]} */
const watchers = [];

vi.mock('node:fs', () => {
  const watch = vi.fn((dir, _opts, cb) => {
    // Minimal event emitter interface for FSWatcher
    const handlers = /** @type {{ close: Array<() => void> }} */ ({ close: [] });
    const w = {
      close: () => handlers.close.forEach((fn) => fn()),
    };
    watchers.push({ dir, cb, w });
    return /** @type {any} */ (w);
  });
  return { default: { watch }, watch };
});

beforeEach(() => {
  watchers.length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('watchIssuesJsonl', () => {
  test('debounces rapid change events', () => {
    const calls = [];
    const handle = watchIssuesJsonl('/repo', (p) => calls.push(p), { debounce_ms: 100 });
    expect(watchers.length).toBe(1);
    const { cb } = watchers[0];

    // Fire multiple changes in quick succession
    cb('change', 'issues.jsonl');
    cb('change', 'issues.jsonl');
    cb('rename', 'issues.jsonl');

    // Nothing yet until debounce passes
    expect(calls.length).toBe(0);
    vi.advanceTimersByTime(99);
    expect(calls.length).toBe(0);
    vi.advanceTimersByTime(1);
    expect(calls.length).toBe(1);

    // Cleanup
    handle.close();
  });

  test('ignores other filenames', () => {
    const calls = [];
    const handle = watchIssuesJsonl('/repo', (p) => calls.push(p), { debounce_ms: 50 });
    const { cb } = watchers[0];
    cb('change', 'something-else.jsonl');
    vi.advanceTimersByTime(60);
    expect(calls.length).toBe(0);
    handle.close();
  });
});
