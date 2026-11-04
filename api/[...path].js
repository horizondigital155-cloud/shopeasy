import app from '../server/index.js';

// Vercel catch-all function: preserve the original /api/... URL for Express.
export default function handler(req, res) {
  return app(req, res);
}
