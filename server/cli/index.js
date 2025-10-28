import { enableAllDebug } from '../logging.js';
import { handleRestart, handleStart, handleStop } from './commands.js';
import { printUsage } from './usage.js';

/**
 * Parse argv into a command token and flags.
 *
 * @param {string[]} args
 * @returns {{ command: string | null, flags: string[] }}
 */
export function parseArgs(args) {
  /** @type {string[]} */
  const flags = [];
  /** @type {string | null} */
  let command = null;

  for (const token of args) {
    if (token === '--help' || token === '-h') {
      flags.push('help');
      continue;
    }
    if (token === '--debug' || token === '-d') {
      flags.push('debug');
      continue;
    }
    if (token === '--open') {
      flags.push('open');
      continue;
    }
    if (
      !command &&
      (token === 'start' || token === 'stop' || token === 'restart')
    ) {
      command = token;
      continue;
    }
    // Ignore unrecognized tokens for now; future flags may be parsed here.
  }

  return { command, flags };
}

/**
 * CLI main entry. Returns an exit code and prints usage on `--help` or errors.
 * No side effects beyond invoking stub handlers.
 *
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function main(args) {
  const { command, flags } = parseArgs(args);

  const is_debug = flags.includes('debug');
  if (is_debug) {
    enableAllDebug();
  }

  if (flags.includes('help')) {
    printUsage(process.stdout);
    return 0;
  }
  if (!command) {
    printUsage(process.stdout);
    return 1;
  }

  if (command === 'start') {
    /**
     * Default behavior: do NOT open a browser. `--open` explicitly opens.
     */
    const options = {
      open: flags.includes('open'),
      is_debug: is_debug || Boolean(process.env.DEBUG)
    };
    return await handleStart(options);
  }
  if (command === 'stop') {
    return await handleStop();
  }
  if (command === 'restart') {
    const options = {
      open: flags.includes('open'),
      is_debug: is_debug || Boolean(process.env.DEBUG)
    };
    return await handleRestart(options);
  }

  // Unknown command path (should not happen due to parseArgs guard)
  printUsage(process.stdout);
  return 1;
}
