import { describe, expect, test, vi } from 'vitest';
import { handleStart, handleStop } from './commands.js';
import * as daemon from './daemon.js';

describe('handleStart (unit)', () => {
  test('returns 1 when daemon start fails', async () => {
    const read_pid = vi.spyOn(daemon, 'readPidFile').mockReturnValue(null);
    const is_running = vi
      .spyOn(daemon, 'isProcessRunning')
      .mockReturnValue(false);
    const start = vi.spyOn(daemon, 'startDaemon').mockReturnValue(null);

    const code = await handleStart({ no_open: true });

    expect(code).toBe(1);

    read_pid.mockRestore();
    is_running.mockRestore();
    start.mockRestore();
  });

  test('returns 0 when already running', async () => {
    const read_pid = vi.spyOn(daemon, 'readPidFile').mockReturnValue(12345);
    const is_running = vi
      .spyOn(daemon, 'isProcessRunning')
      .mockReturnValue(true);
    const print_url = vi
      .spyOn(daemon, 'printServerUrl')
      .mockImplementation(() => {});

    const code = await handleStart({ no_open: true });

    expect(code).toBe(0);
    expect(print_url).toHaveBeenCalledTimes(1);

    read_pid.mockRestore();
    is_running.mockRestore();
    print_url.mockRestore();
  });
});

describe('handleStop (unit)', () => {
  test('returns 2 when not running and no PID file', async () => {
    const read_pid = vi.spyOn(daemon, 'readPidFile').mockReturnValue(null);

    const code = await handleStop();

    expect(code).toBe(2);

    read_pid.mockRestore();
  });

  test('returns 2 on stale PID and removes file', async () => {
    const read_pid = vi.spyOn(daemon, 'readPidFile').mockReturnValue(1111);
    const is_running = vi
      .spyOn(daemon, 'isProcessRunning')
      .mockReturnValue(false);
    const remove_pid = vi
      .spyOn(daemon, 'removePidFile')
      .mockImplementation(() => {});

    const code = await handleStop();

    expect(code).toBe(2);
    expect(remove_pid).toHaveBeenCalledTimes(1);

    read_pid.mockRestore();
    is_running.mockRestore();
    remove_pid.mockRestore();
  });

  test('returns 0 when process terminates and removes PID', async () => {
    const read_pid = vi.spyOn(daemon, 'readPidFile').mockReturnValue(2222);
    const is_running = vi
      .spyOn(daemon, 'isProcessRunning')
      .mockReturnValue(true);
    const terminate = vi
      .spyOn(daemon, 'terminateProcess')
      .mockResolvedValue(true);
    const remove_pid = vi
      .spyOn(daemon, 'removePidFile')
      .mockImplementation(() => {});

    const code = await handleStop();

    expect(code).toBe(0);
    expect(remove_pid).toHaveBeenCalledTimes(1);

    read_pid.mockRestore();
    is_running.mockRestore();
    terminate.mockRestore();
    remove_pid.mockRestore();
  });
});
