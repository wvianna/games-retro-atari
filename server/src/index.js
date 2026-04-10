import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseRomName } from './romParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROMS_DIR = path.resolve(__dirname, '../../ROMS');
const PORT = process.env.PORT || 3001;

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
// Restrict CORS to same-origin in production; allow localhost in development
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [process.env.ALLOWED_ORIGIN || ''].filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. curl, Postman, same-page fetch)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
  })
);

// Prevent MIME sniffing & clickjacking
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// ─── ROM catalogue ────────────────────────────────────────────────────────────

/** Cached catalogue, rebuilt on first request and whenever the ROMS dir changes. */
let catalogueCache = null;

function buildCatalogue() {
  const files = fs.readdirSync(ROMS_DIR).filter((f) => f.toLowerCase().endsWith('.bin'));
  catalogueCache = files.map((f) => ({ id: encodeURIComponent(f), ...parseRomName(f) }));
  return catalogueCache;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/roms — returns full catalogue with metadata */
app.get('/api/roms', (_req, res) => {
  try {
    const catalogue = catalogueCache ?? buildCatalogue();
    res.json({ count: catalogue.length, roms: catalogue });
  } catch (err) {
    console.error('Failed to list ROMs', err);
    res.status(500).json({ error: 'Could not read ROM directory' });
  }
});

/** GET /api/roms/search?q=pitfall — case-insensitive title search */
app.get('/api/roms/search', (req, res) => {
  const q = (req.query.q ?? '').toString().toLowerCase().trim();
  if (!q) return res.json({ roms: [] });

  const catalogue = catalogueCache ?? buildCatalogue();
  const results = catalogue.filter((r) => r.title.toLowerCase().includes(q));
  res.json({ count: results.length, roms: results });
});

/** GET /api/roms/:id — stream the binary ROM file */
app.get('/api/roms/:id', (req, res) => {
  // Decode and sanitise: strip any path traversal attempts
  const rawId = decodeURIComponent(req.params.id);
  const safeFilename = path.basename(rawId);

  // Extra guard: must end in .bin
  if (!safeFilename.toLowerCase().endsWith('.bin')) {
    return res.status(400).json({ error: 'Invalid ROM id' });
  }

  const romPath = path.join(ROMS_DIR, safeFilename);

  // Ensure resolved path stays inside ROMS_DIR (path-traversal prevention)
  if (!romPath.startsWith(ROMS_DIR + path.sep) && romPath !== ROMS_DIR) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!fs.existsSync(romPath)) {
    return res.status(404).json({ error: 'ROM not found' });
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  fs.createReadStream(romPath).pipe(res);
});

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Error handler ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Atari ROM server listening on http://localhost:${PORT}`));
}

export { app };
