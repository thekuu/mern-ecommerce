import { Request, Response } from 'express';
import app from '../server.js';

export default function handler(req: Request, res: Response) {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url === '/' ? '' : req.url);
  }
  return app(req, res);
}
