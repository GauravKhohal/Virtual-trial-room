// VITE_API_BASE must be set at deploy time (Vite env vars are baked in at
// build time, not read at runtime) — falls back to localhost for local dev.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5500';
const REQUEST_TIMEOUT_MS = 3 * 60 * 1000;

// The backend now downloads result images locally and returns a relative path
// like /uploads/result-xxx.jpg — convert to an absolute URL pointing at our
// own server so the browser loads from us (fast, stable) instead of from a
// Hugging Face / Fashn CDN URL that may be slow or expire within minutes.
function resolveResultUrl(urlOrPath: string): string {
  return urlOrPath.startsWith('/') ? `${API_BASE}${urlOrPath}` : urlOrPath;
}

export async function blobUrlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read photo'));
    reader.readAsDataURL(blob);
  });
}

// Primary try-on via Fashn.ai — supports tops, bottoms, and one-pieces
// explicitly, giving far better results than the old free models which were
// upper-body-only (IDM-VTON) or needed their own separate infrastructure
// (CatVTON). Category mapping lives in TrialRoom.tsx's fashnCategory().
export async function requestFashnTryOn(
  personImage: string,
  garmentImage: string,
  category: 'tops' | 'bottoms' | 'one-pieces' | 'auto'
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/api/tryon-fashn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personImage, garmentImage, category }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Fashn.ai try-on failed.');
    return resolveResultUrl(json.resultUrl as string);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Fashn.ai timed out. Try again in a moment.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// Legacy free-model functions — kept for reference but no longer called from
// the UI. Use requestFashnTryOn() for all new try-on flows instead.
export async function requestFullOutfitTryOn(personImage: string, garmentImage: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/tryon-overall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personImage, garmentImage }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Full-outfit try-on failed.');
    return resolveResultUrl(json.resultUrl as string);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('The AI service timed out. Try again in a bit.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestRealTryOn(personImage: string, garmentImage: string, garmentDescription: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/tryon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personImage, garmentImage, garmentDescription }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Try-on generation failed.');
    return resolveResultUrl(json.resultUrl as string);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('The AI service timed out. Try again in a bit.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
