import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as commands from './commands.js';
import { main, parseArgs } from './index.js';

vi.mock('./commands.js', () => ({
  handleStart: vi.fn().mockResolvedValue(0),
  handleStop: vi.fn().mockResolvedValue(0),
  handleRestart: vi.fn().mockResolvedValue(0)
}));

/** @type {import('vitest').MockInstance} */
let write_mock;

beforeEach(() => {
  write_mock = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(() => {
  write_mock.mockRestore();
});

describe('parseArgs', () => {
  test('returns help flag when -h or --help present', () => {
    const r1 = parseArgs(['-h']);
    const r2 = parseArgs(['--help']);

    expect(r1.flags.includes('help')).toBe(true);
    expect(r2.flags.includes('help')).toBe(true);
  });

  test('returns command token when valid', () => {
    expect(parseArgs(['start']).command).toBe('start');
    expect(parseArgs(['stop']).command).toBe('stop');
    expect(parseArgs(['restart']).command).toBe('restart');
  });

  test('recognizes --no-open flag', () => {
    const r = parseArgs(['start', '--no-open']);

    expect(r.flags.includes('no-open')).toBe(true);
  });
});

describe('main', () => {
  test('prints usage and exits 0 on --help', async () => {
    const code = await main(['--help']);

    expect(code).toBe(0);
    expect(write_mock).toHaveBeenCalled();
  });

  test('prints usage and exits 1 on no command', async () => {
    const code = await main([]);

    expect(code).toBe(1);
    expect(write_mock).toHaveBeenCalled();
  });

  test('dispatches to start handler', async () => {
    const code = await main(['start']);

    expect(code).toBe(0);
    expect(commands.handleStart).toHaveBeenCalledTimes(1);
  });

  test('propagates --no-open to start handler', async () => {
    await main(['start', '--no-open']);

    expect(commands.handleStart).toHaveBeenCalledWith({ no_open: true });
  });

  test('reads BDUI_NO_OPEN=1 to disable open', async () => {
    const prev = process.env.BDUI_NO_OPEN;
    try {
      process.env.BDUI_NO_OPEN = '1';

      await main(['start']);

      expect(commands.handleStart).toHaveBeenCalledWith({ no_open: true });
    } finally {
      if (prev === undefined) {
        delete process.env.BDUI_NO_OPEN;
      } else {
        process.env.BDUI_NO_OPEN = prev;
      }
    }
  });

  test('dispatches to stop handler', async () => {
    const code = await main(['stop']);

    expect(code).toBe(0);
    expect(commands.handleStop).toHaveBeenCalledTimes(1);
  });

  test('dispatches to restart handler', async () => {
    const code = await main(['restart']);

    expect(code).toBe(0);
    expect(commands.handleRestart).toHaveBeenCalledTimes(1);
  });

  test('unknown command prints usage and exits 1', async () => {
    const code = await main(['unknown']);

    expect(code).toBe(1);
    expect(write_mock).toHaveBeenCalled();
  });
});
