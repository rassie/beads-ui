/**
 * @import { Express, Request, Response } from 'express'
 */
import express from 'express';
import path from 'node:path';

/**
 * Create and configure the Express application.
 * @param {{ host: string, port: number, env: string, app_dir: string, root_dir: string }} config - Server configuration.
 * @returns {Express} Configured Express app instance.
 */
export function createApp(config) {
  const app = express();

  // Basic hardening and config
  app.disable('x-powered-by');

  // Health endpoint
  /**
   * @param {Request} _req
   * @param {Response} res
   */
  app.get('/healthz', (_req, res) => {
    res.type('application/json');
    res.status(200).send({ ok: true });
  });

  // Static assets from /app
  app.use(express.static(config.app_dir));

  // Root serves index.html explicitly (even if static would catch it)
  /**
   * @param {Request} _req
   * @param {Response} res
   */
  app.get('/', (_req, res) => {
    const index_path = path.join(config.app_dir, 'index.html');
    res.sendFile(index_path);
  });

  return app;
}
