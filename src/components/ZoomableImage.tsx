import { useState } from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

export default function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(1);
  // `width: 100%` stretches the image to fill its container's CSS width —
  // for a result photo that's e.g. 768px native but sitting in a wider card,
  // that's an upscale, which is exactly what was reported as "blurred." Zoom
  // should scale from the image's real pixel size, not an arbitrary
  // container width, so 100% always means "actual resolution, no upscaling."
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  // The result image is hosted on Hugging Face's CDN, not our own server —
  // on a slow/flaky mobile connection it can fail to load entirely, which
  // previously showed nothing but a tiny broken-image glyph with zero
  // explanation. Track load state explicitly so that failure is visible and
  // recoverable instead of silent.
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  return (
    <div>
      <div
        className="relative overflow-auto rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center"
        style={{ maxHeight: 600, minHeight: status === 'loaded' ? undefined : 160 }}
      >
        {status === 'loading' && <p className="text-xs text-slate-400 py-8">Loading image...</p>}
        {status === 'error' && (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-rose-600 mb-2">
              Couldn't load the result image — this can happen on a slow connection (it's hosted on Hugging Face's
              servers, not ours).
            </p>
            <button
              onClick={() => {
                setStatus('loading');
                setRetryCount((c) => c + 1);
              }}
              className="text-xs text-indigo-600 font-medium hover:underline"
            >
              Retry loading image
            </button>
          </div>
        )}
        {/* Tailwind's preflight resets `img { max-width: 100% }`, which silently
            clamps any inline width back down regardless of specificity (max-width
            always wins over width) — override it explicitly or zooming is a no-op. */}
        <img
          key={retryCount}
          src={src}
          alt={alt}
          onLoad={(e) => {
            setNaturalWidth(e.currentTarget.naturalWidth);
            setStatus('loaded');
          }}
          onError={() => setStatus('error')}
          style={{
            display: status === 'loaded' ? 'block' : 'none',
            ...(naturalWidth ? { width: naturalWidth * zoom, maxWidth: 'none' } : { maxWidth: '100%' }),
          }}
        />
      </div>
      <div className="flex items-center justify-center gap-3 mt-2">
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
          disabled={zoom <= MIN_ZOOM}
          className="w-8 h-8 rounded-full border border-slate-300 text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-100"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="text-xs text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
          disabled={zoom >= MAX_ZOOM}
          className="w-8 h-8 rounded-full border border-slate-300 text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-100"
          aria-label="Zoom in"
        >
          +
        </button>
        {zoom !== 1 && (
          <button onClick={() => setZoom(1)} className="text-xs text-indigo-600 font-medium hover:underline">
            Reset
          </button>
        )}
      </div>
      {zoom > 1 && <p className="text-center text-[11px] text-slate-400 mt-1">Scroll within the image to pan around</p>}
    </div>
  );
}
