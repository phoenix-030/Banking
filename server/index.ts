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

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters.');
}

const PgStore = connectPgSimple(session);

// 1. Core security settings
app.disable('x-powered-by');
app.set('trust proxy', production ? 1 : false);

// 2. Comprehensive HTTP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*', 'ws://127.0.0.1:*'],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// 3. Permissions-Policy Header
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  next();
});

// 4. Safe body size limits
app.use(express.json({ limit: '2mb' }));

// 5. Hardened Session Management
app.use(
  session({
    store: new PgStore({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 15 * 60,
    }),
    name: 'hhk.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
    },
  })
);

// 6. Anti-CSRF Origin Verification on state-changing API requests
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) return next();
  try {
    const originHost = new URL(origin).host;
    const allowedHosts = new Set([
      req.get('host'),
      'localhost:5173',
      'localhost:3001',
      '127.0.0.1:5173',
      '127.0.0.1:3001',
    ]);
    if (process.env.APP_URL) {
      try {
        allowedHosts.add(new URL(process.env.APP_URL).host);
      } catch {}
    }
    if (allowedHosts.has(originHost)) return next();
    return res.status(403).json({ error: 'Cross-origin request blocked.' });
  } catch {
    return res.status(403).json({ error: 'Invalid origin header.' });
  }
});

// 7. Global API Rate Limiter
app.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    limit: 200,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  })
);

// 8. Health check
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'database_unavailable' });
  }
});

// 9. API Routes
app.use('/api/auth', authRouter);
app.use('/api', contentRouter);
app.use('/api', attemptRouter);
app.use('/api/admin', adminRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

// 10. Production static serving
if (production) {
  const distPath = path.join(projectRoot, 'dist');
  app.use(express.static(distPath, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'), error => {
      if (error) next(error);
    });
  });
}

// 11. Centralized Safe Error Handler
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error?.stack ?? error);
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '),
    });
  }
  if (error?.code === '23505') {
    return res.status(409).json({ error: 'A record with that unique value already exists.' });
  }
  if (error?.code === '23503') {
    return res.status(400).json({ error: 'A related record is invalid or in use.' });
  }
  if (error?.status && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }
  res.status(500).json({ error: 'Something went wrong. Try again shortly.' });
});

app.listen(port, () => console.log(`HHK API listening on http://localhost:${port}`));
