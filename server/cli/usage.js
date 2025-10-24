/**
 * Print CLI usage to a stream-like target.
 * @param {{ write: (chunk: string) => any }} out_stream
 */
export function printUsage(out_stream) {
  const lines = [
    'Usage: bdui <command> [options]',
    '',
    'Commands:',
    '  start       Start the UI server (daemonized in later steps)',
    '  stop        Stop the UI server',
    '  restart     Restart the UI server',
    '',
    'Options:',
    '  -h, --help   Show this help message',
    '      --open   Open the browser after start',
    ''
  ];
  for (const line of lines) {
    out_stream.write(line + '\n');
  }
}
