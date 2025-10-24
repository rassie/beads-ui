import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve runtime configuration for the server.
 * @returns {{ host: string, port: number, env: string, app_dir: string, root_dir: string, url: string }}
 */
export function getConfig() {
  const this_file = fileURLToPath(new URL(import.meta.url));
  const server_dir = path.dirname(this_file);
  const root_dir = path.resolve(server_dir, '..');

  /** @type {number} */
  let port_value = Number.parseInt(process.env.PORT || '', 10);
  if (!Number.isFinite(port_value)) {
    port_value = 3000;
  }

  /** @type {string} */
  const host_value = '127.0.0.1';

  return {
    host: host_value,
    port: port_value,
    env: process.env.NODE_ENV ? String(process.env.NODE_ENV) : 'development',
    app_dir: path.resolve(root_dir, 'app'),
    root_dir,
    url: `http://${host_value}:${port_value}`
  };
}
