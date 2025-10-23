import { createServer } from 'node:http';
import { createApp } from './app.js';
import { getConfig } from './config.js';
import { watchDb } from './watcher.js';
import { attachWsServer } from './ws.js';

const config = getConfig();
const app = createApp(config);
const server = createServer(app);
const { notifyIssuesChanged } = attachWsServer(server, {
  path: '/ws',
  heartbeat_ms: 30000
});

// Watch the active beads DB and push invalidation (targeted when possible)
watchDb(config.root_dir, (payload) => {
  notifyIssuesChanged(payload);
});

server.listen(config.port, config.host, () => {
  console.log(
    `beads-ui server listening on http://${config.host}:${config.port} (${config.env})`
  );
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exitCode = 1;
});
