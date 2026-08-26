import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@gradio/client';
import pg from 'pg';

// Local secrets (HF_TOKEN for the full-outfit model below) — server/.env,
// gitignored, never committed. Missing file is fine, just means that one
// feature stays unavailable.
try {
  process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'));
} catch {
  // no .env present — fine, HF_TOKEN-dependent features just won't be available
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const PORT = process.env.PORT || 5500;
const SPACE = 'yisol/IDM-VTON';
// CatVTON is the only free model found that supports a true single-pass
// "overall" (full outfit) mode — needed for one-piece garments like a lehenga
// or saree, which IDM-VTON above can only (mis)handle as an upper-body top.
// Requires a Hugging Face token (HF_TOKEN in server/.env) — anonymous requests
// get 0s of its shared ZeroGPU quota.
const FULL_OUTFIT_SPACE = 'zhengchong/CatVTON';

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// --- PostgreSQL (Railway plugin, same project) — the source of truth for
// anything that needs to survive a redeploy. Railway containers start fresh
// from the deployed image on every restart, and even a CLI `railway up`
// re-ships whatever happens to be in the local uploads/ folder on the
// deploying machine rather than preserving what's already live — a flat file
// (or a file on disk generally) is not a reliable place to keep product
// photos. (AI try-on RESULT images are the one thing that stays on disk —
// they're single-use, shown once to the customer generating them, and don't
// need to survive a restart the way a catalog photo does.)
const { Pool } = pg;
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Internal Railway connections (*.railway.internal) don't need SSL;
  // external/public connections (*.proxy.rlwy.net or Render etc.) do.
  ssl: process.env.DATABASE_URL?.includes('.railway.internal') ? false
    : process.env.DATABASE_URL ? { rejectUnauthorized: false }
    : false,
});

// Create the tables once on startup — idempotent, safe to run on every boot.
db.query(`
  CREATE TABLE IF NOT EXISTS custom_products (
    id TEXT PRIMARY KEY,
    product JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch((err) => console.error('[db] custom_products table init failed:', err));

db.query(`
  CREATE TABLE IF NOT EXISTS product_images (
    product_id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    data BYTEA NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch((err) => console.error('[db] product_images table init failed:', err));

// --- Product photo storage (bytes in Postgres, not files on disk) ---

app.get('/api/products/images', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT product_id FROM product_images');
    const map = {};
    for (const row of rows) map[row.product_id] = `/api/products/${row.product_id}/photo`;
    res.json(map);
  } catch (err) {
    console.error('[products] images list failed:', err);
    res.status(500).json({ error: 'Could not load product photos.' });
  }
});

app.get('/api/products/:productId/photo', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT content_type, data FROM product_images WHERE product_id = $1',
      [req.params.productId]
    );
    if (rows.length === 0) return res.status(404).end();
    res.set('Content-Type', rows[0].content_type);
    // Product photos are replaced by re-uploading (new row, same id) rather
    // than mutated in place, so this URL's content never changes — safe to
    // cache aggressively.
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(rows[0].data);
  } catch (err) {
    console.error('[products] photo fetch failed:', err);
    res.status(500).end();
  }
});

app.post('/api/products/:productId/image', upload.single('photo'), async (req, res) => {
  const { productId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

  try {
    await db.query(
      `INSERT INTO product_images (product_id, content_type, data, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (product_id) DO UPDATE SET content_type = $2, data = $3, updated_at = NOW()`,
      [productId, req.file.mimetype, req.file.buffer]
    );
    res.json({ url: `/api/products/${productId}/photo` });
  } catch (err) {
    console.error('[products] photo upload failed:', err);
    res.status(500).json({ error: 'Could not save photo.' });
  }
});

app.delete('/api/products/:productId/image', async (req, res) => {
  try {
    await db.query('DELETE FROM product_images WHERE product_id = $1', [req.params.productId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[products] photo delete failed:', err);
    res.status(500).json({ error: 'Could not delete photo.' });
  }
});

// --- Custom products (store owner's real catalog, added via Owner Dashboard) ---
// persisted in the same PostgreSQL instance, for the same reason as above.

app.get('/api/custom-products', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT product FROM custom_products ORDER BY created_at');
    res.json(rows.map((r) => r.product));
  } catch (err) {
    console.error('[custom-products] GET failed:', err);
    res.status(500).json({ error: 'Could not load products.' });
  }
});

app.post('/api/custom-products', async (req, res) => {
  const { name, brand, type, gender, price, color, colorHex, sizes, occasions } = req.body || {};
  if (
    !name || typeof name !== 'string' ||
    !brand || typeof brand !== 'string' ||
    !type || typeof type !== 'string' ||
    !gender || typeof gender !== 'string' ||
    !price || typeof price !== 'number' ||
    !color || typeof color !== 'string' ||
    !colorHex || typeof colorHex !== 'string' ||
    !Array.isArray(sizes) || sizes.length === 0
  ) {
    return res.status(400).json({
      error: 'name, brand, type, gender, price (number), color, colorHex, and at least one size are required.',
    });
  }

  // "owner-" prefix deliberately avoids colliding with the pasted-link-photo
  // filename convention filtered out in /api/products/images.
  const id = `owner-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const product = {
    id, name, brand, type, gender, price, color, colorHex,
    sizes,
    occasions: Array.isArray(occasions) ? occasions : [],
  };
  try {
    await db.query('INSERT INTO custom_products (id, product) VALUES ($1, $2)', [id, product]);
    res.json(product);
  } catch (err) {
    console.error('[custom-products] POST failed:', err);
    res.status(500).json({ error: 'Could not save product.' });
  }
});

app.delete('/api/custom-products/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM custom_products WHERE id = $1', [req.params.id]);
    await db.query('DELETE FROM product_images WHERE product_id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[custom-products] DELETE failed:', err);
    res.status(500).json({ error: 'Could not delete product.' });
  }
});

// --- Real AI virtual try-on proxy (free IDM-VTON Hugging Face Space) ---

let clientPromise = null;
function getClient() {
  if (!clientPromise) {
    clientPromise = Client.connect(SPACE).catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

// After any AI model generates a result, the URL it returns points to the
// model provider's own servers (HuggingFace CDN, Fashn CDN, etc.). Returning
// that URL directly to the browser means:
//   1. The browser fetches across the internet to a foreign CDN — slow,
//      especially from India.
//   2. Those URLs can expire within minutes (HF temp files especially).
//   3. Any HF reliability issues become visible to the customer.
// Downloading it here and serving from our own Railway/local backend means
// the browser loads from our server (same region, stable URL, no expiry).
async function downloadResultLocally(externalUrl) {
  const response = await fetch(externalUrl);
  if (!response.ok) throw new Error(`Could not download result image: ${response.status}`);
  const buf = Buffer.from(await response.arrayBuffer());
  const contentType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  const ext = extMap[contentType] || '.jpg';
  const filename = `result-${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);
  return `/uploads/${filename}`;
}

async function toBlob(source) {
  if (typeof source !== 'string') {
    throw new Error('Image must be a data URL or http(s) URL string');
  }
  if (source.startsWith('data:')) {
    const [, meta, base64] = source.match(/^data:(.*?);base64,(.*)$/s) || [];
    if (!base64) throw new Error('Malformed data URL');
    return new Blob([Buffer.from(base64, 'base64')], { type: meta || 'image/png' });
  }
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch garment image: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return new Blob([buf], { type: res.headers.get('content-type') || 'image/png' });
  }
  // relative path like /uploads/xyz.jpg served by this same server
  if (source.startsWith('/')) {
    return toBlob(`http://localhost:${PORT}${source}`);
  }
  throw new Error('Unsupported image source');
}

app.post('/api/tryon', async (req, res) => {
  const { personImage, garmentImage, garmentDescription } = req.body || {};
  if (!personImage || !garmentImage) {
    return res.status(400).json({ error: 'personImage and garmentImage are required' });
  }

  try {
    const [personBlob, garmentBlob] = await Promise.all([toBlob(personImage), toBlob(garmentImage)]);
    const client = await getClient();

    const result = await client.predict('/tryon', {
      dict: { background: personBlob, layers: [], composite: null },
      garm_img: garmentBlob,
      garment_des: garmentDescription || 'garment',
      is_checked: true,
      is_checked_crop: false,
      denoise_steps: 20,
      seed: Math.floor(Math.random() * 100000),
    });

    const [output, mask] = result.data || [];
    if (!output?.url) throw new Error('Model returned no output image');

    const localPath = await downloadResultLocally(output.url);
    res.json({ resultUrl: localPath, maskUrl: null });
  } catch (err) {
    console.error('[tryon] failed:', err);
    res.status(502).json({ error: err.message || 'Try-on generation failed. The free model queue may be busy — try again shortly.' });
  }
});

// --- Full-outfit AI try-on (free CatVTON Hugging Face Space, ZeroGPU) ---
// One-piece garments (lehenga, saree, gown) aren't an "upper body garment" —
// applying them through IDM-VTON above produces the broken split-top result
// users were seeing. CatVTON's cloth_type="overall" mode is built for exactly
// this case, but its ZeroGPU quota is 0s for anonymous requests — needs HF_TOKEN.

// A blank (uniform-colour) 768x1024 grayscale PNG, matching the model's
// expected working resolution — see the comment at its usage below for why
// this (rather than an empty layers array) is required. A 1x1 placeholder
// here caused "broken data stream when reading image file" from their
// backend, so this is sized to match their pipeline's args.width/height.
const BLANK_MASK_BLOB = new Blob(
  [
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAwAAAAQACAAAAABzTWHcAAADEklEQVR4nO3BgQAAAADDoPlTX+EAVQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8BgS0AAHvCFTWAAAAAElFTkSuQmCC',
      'base64'
    ),
  ],
  { type: 'image/png' }
);

let fullOutfitClientPromise = null;
function getFullOutfitClient() {
  if (!fullOutfitClientPromise) {
    fullOutfitClientPromise = Client.connect(FULL_OUTFIT_SPACE, { token: process.env.HF_TOKEN }).catch((err) => {
      fullOutfitClientPromise = null;
      throw err;
    });
  }
  return fullOutfitClientPromise;
}

app.post('/api/tryon-overall', async (req, res) => {
  const { personImage, garmentImage } = req.body || {};
  if (!personImage || !garmentImage) {
    return res.status(400).json({ error: 'personImage and garmentImage are required' });
  }
  if (!process.env.HF_TOKEN) {
    return res.status(503).json({
      error: 'Full-outfit AI try-on needs a Hugging Face token configured on the server (add HF_TOKEN to server/.env and restart).',
    });
  }

  try {
    const [personBlob, garmentBlob] = await Promise.all([toBlob(personImage), toBlob(garmentImage)]);
    const client = await getFullOutfitClient();

    // CatVTON's app.py does `person_image["layers"][0]` unconditionally — an
    // empty layers array throws IndexError before it ever gets to check
    // whether a mask was actually drawn. A single blank (uniform-colour) layer
    // satisfies that indexing and is recognized by their own code as "no mask
    // drawn" (np.unique length 1), which makes it fall back to their
    // automasker — exactly the "just auto-detect the body region" behavior we
    // want since we're not offering manual mask-painting in our UI.
    const result = await client.predict('/submit_function', {
      person_image: { background: personBlob, layers: [BLANK_MASK_BLOB], composite: null },
      cloth_image: garmentBlob,
      cloth_type: 'overall',
      // Their own UI default is 50 — we'd dropped this to 30 to mirror the
      // IDM-VTON endpoint's speed tradeoff, but that traded away noticeable
      // sharpness (reported as "its blurred"). Full default costs more time
      // and HF GPU-quota per generation, but the result is visibly crisper.
      num_inference_steps: 50,
      guidance_scale: 2.5,
      seed: Math.floor(Math.random() * 10000),
      show_type: 'result only',
    });

    const output = result.data?.[0];
    const externalUrl = output?.url || output?.path;
    if (!externalUrl) throw new Error('Model returned no output image');

    const localPath = await downloadResultLocally(externalUrl);
    res.json({ resultUrl: localPath });
  } catch (err) {
    console.error('[tryon-overall] failed:', err);
    const message = err?.message?.includes('quota')
      ? 'Hugging Face GPU quota exceeded for today — full-outfit try-on will work again once it resets.'
      : err.message || 'Full-outfit try-on failed. The free model queue may be busy — try again shortly.';
    res.status(502).json({ error: message });
  }
});

// --- Paid try-on quality eval: Fashn.ai (https://docs.fashn.ai) ---
// Async job API: POST /v1/run returns a prediction id, poll GET
// /v1/status/:id until status is "completed" (or "failed"). Needs
// FASHN_API_KEY in server/.env. This is a separate endpoint from the free
// /api/tryon and /api/tryon-overall above — kept side-by-side deliberately so
// we can A/B compare quality before deciding whether to switch over for real.
const FASHN_API_BASE = 'https://api.fashn.ai/v1';
const FASHN_POLL_INTERVAL_MS = 1500;
const FASHN_POLL_TIMEOUT_MS = 60 * 1000;

// Fashn.ai's error field is sometimes a plain string and sometimes a
// structured object ({name, message}) — passing an object straight into
// `new Error(...)` silently stringifies it to the useless literal text
// "[object Object]", both in our logs and in what the tablet UI displays.
function fashnErrorMessage(err, fallback) {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') return err.message || err.name || JSON.stringify(err);
  return fallback;
}

app.post('/api/tryon-fashn', async (req, res) => {
  const { personImage, garmentImage, category } = req.body || {};
  if (!personImage || !garmentImage) {
    return res.status(400).json({ error: 'personImage and garmentImage are required' });
  }
  if (!process.env.FASHN_API_KEY) {
    return res.status(503).json({
      error: 'Fashn.ai try-on needs an API key configured on the server (add FASHN_API_KEY to server/.env and restart).',
    });
  }

  try {
    const runRes = await fetch(`${FASHN_API_BASE}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FASHN_API_KEY}`,
      },
      // The published docs show model_image/garment_image as top-level fields,
      // but the live API actually rejects that with "Missing inputs field" —
      // confirmed by testing against the real endpoint that everything besides
      // model_name needs to be nested under "inputs".
      body: JSON.stringify({
        model_name: 'tryon-v1.6',
        inputs: {
          model_image: personImage,
          garment_image: garmentImage,
          category: category || 'auto',
          mode: 'balanced',
        },
      }),
    });
    const runJson = await runRes.json();
    if (!runRes.ok || runJson.error) throw new Error(fashnErrorMessage(runJson.error, `Fashn.ai returned HTTP ${runRes.status}`));

    const predictionId = runJson.id;
    const deadline = Date.now() + FASHN_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, FASHN_POLL_INTERVAL_MS));
      const statusRes = await fetch(`${FASHN_API_BASE}/status/${predictionId}`, {
        headers: { Authorization: `Bearer ${process.env.FASHN_API_KEY}` },
      });
      const statusJson = await statusRes.json();
      if (statusJson.status === 'failed') console.error('[tryon-fashn] Fashn.ai reported failure:', JSON.stringify(statusJson));
      if (statusJson.status === 'completed') {
        const localPath = await downloadResultLocally(statusJson.output?.[0]);
        return res.json({ resultUrl: localPath });
      }
      if (statusJson.status === 'failed') {
        throw new Error(fashnErrorMessage(statusJson.error, 'Fashn.ai generation failed'));
      }
      // else: starting / in_queue / processing — keep polling
    }
    throw new Error('Fashn.ai timed out waiting for the result.');
  } catch (err) {
    console.error('[tryon-fashn] failed:', err);
    res.status(502).json({ error: err.message || 'Fashn.ai try-on failed.' });
  }
});

// --- Fitting-room display sync (tablet -> TV) ---
// Each physical fitting room gets a fixed slug (e.g. "room-1") that its TV's
// browser is pointed at once; the tablet in that room pushes whatever the
// customer is doing so the TV can mirror it full-screen. In-memory only —
// this is live "what's on screen right now" state, not data that needs to
// survive a restart, and keeping N of these in a Map costs nothing.
const DISPLAY_STATE_TTL_MS = 2 * 60 * 60 * 1000; // drop rooms idle 2h+
const displayStates = new Map(); // room -> { updatedAt, ...state }
const ROOM_RE = /^[a-zA-Z0-9_-]{1,40}$/;

setInterval(() => {
  const cutoff = Date.now() - DISPLAY_STATE_TTL_MS;
  for (const [room, state] of displayStates) {
    if (state.updatedAt < cutoff) displayStates.delete(room);
  }
}, 30 * 60 * 1000).unref();

app.get('/api/display/:room/state', (req, res) => {
  const { room } = req.params;
  if (!ROOM_RE.test(room)) return res.status(400).json({ error: 'Invalid room code' });
  res.json(displayStates.get(room) || { updatedAt: 0, phase: 'idle' });
});

app.post('/api/display/:room/state', (req, res) => {
  const { room } = req.params;
  if (!ROOM_RE.test(room)) return res.status(400).json({ error: 'Invalid room code' });
  const state = { ...(req.body || {}), updatedAt: Date.now() };
  displayStates.set(room, state);
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Try-on proxy server listening on http://localhost:${PORT}`);
});
