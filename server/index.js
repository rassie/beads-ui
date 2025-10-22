import { createServer } from 'node:http';
import { createApp } from './app.js';
import { getConfig } from './config.js';

const config = getConfig();
const app = createApp(config);
const server = createServer(app);

server.listen(config.port, config.host, () => {
  console.log(`beads-ui server listening on http://${config.host}:${config.port} (${config.env})`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exitCode = 1;
});
