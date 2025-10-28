import { createServer } from 'node:http';
import { createApp } from './app.js';
import { printServerUrl } from './cli/daemon.js';
import { getConfig } from './config.js';
import { debug, enableAllDebug } from './logging.js';
import { watchDb } from './watcher.js';
import { attachWsServer } from './ws.js';

if (process.argv.includes('--debug') || process.argv.includes('-d')) {
  enableAllDebug();
}

const config = getConfig();
const app = createApp(config);
const server = createServer(app);
const log = debug('server');
const { scheduleListRefresh } = attachWsServer(server, {
  path: '/ws',
  heartbeat_ms: 30000,
  // Coalesce DB change bursts into one refresh run
  refresh_debounce_ms: 75
});

// Watch the active beads DB and schedule subscription refresh for active lists
watchDb(config.root_dir, () => {
  // Schedule subscription list refresh run for active subscriptions
  log('db change detected → schedule refresh');
  scheduleListRefresh();
  // v2: all updates flow via subscription push envelopes only
});

server.listen(config.port, config.host, () => {
  printServerUrl();
});

server.on('error', (err) => {
  log('server error %o', err);
  process.exitCode = 1;
});
