import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { ZodError } from 'zod';
import { pool } from './db';
import { authRouter } from './routes/auth';
import { contentRouter } from './routes/content';
import { attemptRouter } from './routes/attempts';
import { adminRouter } from './routes/admin';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const production = process.env.NODE_ENV === 'production';
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
const PgStore = connectPgSimple(session);
app.disable('x-powered-by');
app.set('trust proxy', production ? 1 : false);
app.use(helmet());
app.use(express.json({ limit: '8mb' }));
app.use(session({ store: new PgStore({ pool, tableName: 'user_sessions', createTableIfMissing: true, pruneSessionInterval: 15 * 60 }), name: 'hhk.sid', secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, rolling: true, cookie: { httpOnly: true, secure: production, sameSite: 'lax', maxAge: 12 * 60 * 60 * 1000 } }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/api/health', async (_req, res) => { try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); } catch { res.status(503).json({ status: 'database_unavailable' }); } });
app.use('/api/auth', authRouter);
app.use('/api', contentRouter);
app.use('/api', attemptRouter);
app.use('/api/admin', adminRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
if (production) {
  const distPath = path.join(projectRoot, 'dist');
  app.use(express.static(distPath, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'), error => { if (error) next(error); });
  });
}
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error?.stack ?? error);
  if (error instanceof ZodError) return res.status(400).json({ error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
  if (error?.code === '23505') return res.status(409).json({ error: 'A record with that unique value already exists.' });
  if (error?.code === '23503') return res.status(400).json({ error: 'A related record is invalid or in use.' });
  if (error?.status && error.status < 500) return res.status(error.status).json({ error: error.message });
  res.status(500).json({ error: 'Something went wrong. Try again shortly.' });
});
app.listen(port, () => console.log(`HHK API listening on http://localhost:${port}`));
