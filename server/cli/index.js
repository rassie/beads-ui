import { handleRestart, handleStart, handleStop } from './commands.js';
import { printUsage } from './usage.js';

/**
 * Parse argv into a command token and flags.
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
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function main(args) {
  const { command, flags } = parseArgs(args);

  if (flags.includes('help')) {
    printUsage(process.stdout);
    return 0;
  }
  if (!command) {
    printUsage(process.stdout);
    return 1;
  }

  if (command === 'start') {
    return await handleStart();
  }
  if (command === 'stop') {
    return await handleStop();
  }
  if (command === 'restart') {
    return await handleRestart();
  }

  // Unknown command path (should not happen due to parseArgs guard)
  printUsage(process.stdout);
  return 1;
}
