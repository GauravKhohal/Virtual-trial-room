import { useEffect, useRef, useState } from 'react';
import type { PoseLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { getPoseLandmarker, POSE_LANDMARKS } from '../ai/poseLandmarker';
import { segmentGarmentFromPhoto } from '../ai/garmentSegmenter';

export type OverlayTopType = 'Shirt' | 'T-Shirt' | 'Kurta' | 'Blazer';

export interface OverlayItem {
  color: string;
  imageUrl?: string;
  type?: OverlayTopType;
}

interface LiveTryOnProps {
  topItem: OverlayItem | null;
  bottomItem: OverlayItem | null;
  onCapture: (dataUrl: string) => void;
}

const MIN_VISIBILITY = 0.4;
// Set to true to show dots + visibility scores at detected shoulder/hip points —
// useful for diagnosing tracking issues without guessing blind.
const DEBUG_LANDMARKS = false;

function midpoint(a: NormalizedLandmark, b: NormalizedLandmark) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Simplified garment silhouettes in local unit coordinates (origin centered,
// x/y in [-0.5, 0.5] before scaling) — a plain rectangle reads as "a color
// patch," not "wearing a shirt," so trace an actual outline instead. Each
// clothing type gets a visibly distinct shape rather than reusing one generic
// "shirt" for everything.

// Collared button-up: shallow neck opening (the collar flaps are drawn separately
// on top by drawCollarFlaps — a bare V cut alone reads as a V-neck, not a collar).
function traceCollarShirtPath(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(-0.09 * w, -0.5 * h);
  ctx.lineTo(0, -0.43 * h);
  ctx.lineTo(0.09 * w, -0.5 * h);
  ctx.lineTo(0.35 * w, -0.4 * h);
  ctx.lineTo(0.5 * w, -0.12 * h);
  ctx.lineTo(0.36 * w, -0.02 * h);
  ctx.lineTo(0.3 * w, 0.5 * h);
  ctx.lineTo(-0.3 * w, 0.5 * h);
  ctx.lineTo(-0.36 * w, -0.02 * h);
  ctx.lineTo(-0.5 * w, -0.12 * h);
  ctx.lineTo(-0.35 * w, -0.4 * h);
  ctx.closePath();
}

function darkenColor(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = Math.round(parseInt(c.substring(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(c.substring(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(c.substring(4, 6), 16) * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

// The folded triangular collar flaps that make a button-up read as "collared"
// rather than "V-neck" — drawn on top of the body fill, plus a button placket line.
// Kept subtle (small, lightly-shaded, thin stroke) so it reads as a fabric fold,
// not a stark cartoon bowtie.
function drawCollarFlaps(ctx: CanvasRenderingContext2D, w: number, h: number, fillColor: string | null) {
  const flap = (sign: 1 | -1) => {
    ctx.beginPath();
    // Top two points now match the main collar tips at -0.5h exactly (they used to
    // stop at -0.44h, leaving a thin uncovered strip between the box's top edge and
    // the visible flap — read as part of the "gap above the collar" complaint).
    ctx.moveTo(sign * 0.015 * w, -0.5 * h);
    ctx.lineTo(sign * 0.13 * w, -0.5 * h);
    ctx.lineTo(sign * 0.05 * w, -0.35 * h);
    ctx.closePath();
  };
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = Math.max(1, w * 0.0025);
  for (const sign of [1, -1] as const) {
    flap(sign);
    if (fillColor) {
      ctx.fillStyle = darkenColor(fillColor, 0.12);
      ctx.fill();
    }
    ctx.stroke();
  }
  // button placket
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(0, -0.43 * h);
  ctx.lineTo(0, 0.46 * h);
  ctx.stroke();
  ctx.restore();
}

// T-shirt: round crew neckline, shorter cap sleeves.
function traceTShirtPath(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(-0.15 * w, -0.5 * h);
  ctx.quadraticCurveTo(0, -0.42 * h, 0.15 * w, -0.5 * h);
  ctx.lineTo(0.32 * w, -0.42 * h);
  ctx.lineTo(0.5 * w, -0.24 * h);
  ctx.lineTo(0.38 * w, -0.14 * h);
  ctx.lineTo(0.3 * w, 0.5 * h);
  ctx.lineTo(-0.3 * w, 0.5 * h);
  ctx.lineTo(-0.38 * w, -0.14 * h);
  ctx.lineTo(-0.5 * w, -0.24 * h);
  ctx.lineTo(-0.32 * w, -0.42 * h);
  ctx.closePath();
}

// Kurta: narrow mandarin collar (no chest opening), longer length than a shirt.
function traceKurtaPath(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(-0.08 * w, -0.5 * h);
  ctx.lineTo(0.08 * w, -0.5 * h);
  ctx.lineTo(0.3 * w, -0.42 * h);
  ctx.lineTo(0.46 * w, -0.18 * h);
  ctx.lineTo(0.34 * w, -0.08 * h);
  ctx.lineTo(0.26 * w, 0.62 * h);
  ctx.lineTo(-0.26 * w, 0.62 * h);
  ctx.lineTo(-0.34 * w, -0.08 * h);
  ctx.lineTo(-0.46 * w, -0.18 * h);
  ctx.lineTo(-0.3 * w, -0.42 * h);
  ctx.closePath();
}

// Blazer: structured wide shoulders, open lapels exposing the chest.
function traceBlazerPath(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(-0.14 * w, -0.5 * h);
  ctx.lineTo(0, -0.4 * h);
  ctx.lineTo(0.14 * w, -0.5 * h);
  ctx.lineTo(0.4 * w, -0.4 * h);
  ctx.lineTo(0.52 * w, -0.1 * h);
  ctx.lineTo(0.4 * w, 0.0 * h);
  ctx.lineTo(0.34 * w, 0.5 * h);
  ctx.lineTo(0.1 * w, 0.5 * h);
  ctx.lineTo(0.18 * w, -0.1 * h);
  ctx.lineTo(0, -0.02 * h);
  ctx.lineTo(-0.18 * w, -0.1 * h);
  ctx.lineTo(-0.1 * w, 0.5 * h);
  ctx.lineTo(-0.34 * w, 0.5 * h);
  ctx.lineTo(-0.4 * w, 0.0 * h);
  ctx.lineTo(-0.52 * w, -0.1 * h);
  ctx.closePath();
}

function traceTopPath(ctx: CanvasRenderingContext2D, type: OverlayTopType | undefined, w: number, h: number) {
  switch (type) {
    case 'T-Shirt':
      return traceTShirtPath(ctx, w, h);
    case 'Kurta':
      return traceKurtaPath(ctx, w, h);
    case 'Blazer':
      return traceBlazerPath(ctx, w, h);
    case 'Shirt':
    default:
      return traceCollarShirtPath(ctx, w, h);
  }
}

function tracePantsPath(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(-0.42 * w, -0.5 * h);
  ctx.lineTo(0.42 * w, -0.5 * h);
  ctx.lineTo(0.3 * w, 0.5 * h);
  ctx.lineTo(0.06 * w, 0.5 * h);
  ctx.lineTo(0.04 * w, 0.0 * h);
  ctx.lineTo(-0.04 * w, 0.0 * h);
  ctx.lineTo(-0.06 * w, 0.5 * h);
  ctx.lineTo(-0.3 * w, 0.5 * h);
  ctx.closePath();
}

export default function LiveTryOn({ topItem, bottomItem, onCapture }: LiveTryOnProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const segmentedCacheRef = useRef<Map<string, HTMLCanvasElement | 'pending' | 'failed'>>(new Map());
  // Running the image segmenter concurrently with the pose landmarker's own
  // continuous detection loop causes the two MediaPipe tasks to hang each other
  // (confirmed in testing — each works fine alone). This flag tells the render
  // loop to skip pose detection entirely while a segmentation is in flight.
  const segmentationBusyRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [noPersonDetected, setNoPersonDetected] = useState(false);

  // keep latest overlay items accessible inside the render loop without restarting it
  const topItemRef = useRef(topItem);
  const bottomItemRef = useRef(bottomItem);
  topItemRef.current = topItem;
  bottomItemRef.current = bottomItem;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const [landmarker, stream] = await Promise.all([
          getPoseLandmarker(),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }),
        ]);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        landmarkerRef.current = landmarker;
        streamRef.current = stream;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setStatus('ready');
        renderLoop();
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Could not start live preview.');
        }
      }
    }

    function getOverlayImage(url: string): HTMLImageElement | null {
      const cache = imageCacheRef.current;
      const cached = cache.get(url);
      if (cached) {
        // Once the raw photo is loaded, kick off real segmentation once (cached
        // per URL) so we can isolate just the garment instead of guessing a crop.
        if (!segmentedCacheRef.current.has(url)) {
          segmentedCacheRef.current.set(url, 'pending');
          segmentationBusyRef.current = true;
          segmentGarmentFromPhoto(cached)
            .then((canvas) => segmentedCacheRef.current.set(url, canvas))
            .catch(() => segmentedCacheRef.current.set(url, 'failed'))
            .finally(() => {
              segmentationBusyRef.current = false;
            });
        }
        return cached;
      }
      loadImage(url)
        .then((img) => cache.set(url, img))
        .catch(() => {});
      return null;
    }

    function getSegmentedOverlay(url: string): HTMLCanvasElement | null {
      const entry = segmentedCacheRef.current.get(url);
      return entry && entry !== 'pending' && entry !== 'failed' ? entry : null;
    }

    function drawOverlay(
      ctx: CanvasRenderingContext2D,
      item: OverlayItem,
      kind: 'top' | 'bottom',
      center: { x: number; y: number },
      angle: number,
      width: number,
      height: number
    ) {
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(angle);
      const img = item.imageUrl ? getOverlayImage(item.imageUrl) : null;
      const segmented = item.imageUrl ? getSegmentedOverlay(item.imageUrl) : null;
      if (img) {
        ctx.globalAlpha = 0.95;
        if (kind === 'top') traceTopPath(ctx, item.type, width, height);
        else tracePantsPath(ctx, width, height);
        ctx.save();
        ctx.clip();
        if (segmented) {
          // Real per-pixel segmentation isolated the "clothes" category. Fit it to
          // *cover* the box while preserving its own aspect ratio (like CSS
          // object-fit: cover) instead of stretching it to the box's exact
          // proportions, which distorted the garment. Any overflow is fine — the
          // silhouette clip above already crops it.
          // Anchor the TOP edge to the box's top (the collar) rather than centering
          // vertically — centering let overflow push the collar above the visible
          // clip area, so the rendered shirt appeared to start partway down instead
          // of at the neck. Any overflow now only extends the hem further down,
          // which the silhouette clip handles fine.
          const boxAspect = width / height;
          const imgAspect = segmented.width / segmented.height;
          const drawW = imgAspect > boxAspect ? height * imgAspect : width;
          const drawH = imgAspect > boxAspect ? height : width / imgAspect;
          ctx.drawImage(segmented, 0, 0, segmented.width, segmented.height, -drawW / 2, -height / 2, drawW, drawH);
        } else {
          // Segmentation hasn't finished yet (or failed) — fall back to guessing
          // that a model's head/face occupies the top fraction of the photo.
          const headCropFrac = kind === 'top' ? 0.3 : 0.12;
          const sy = img.naturalHeight * headCropFrac;
          const sh = img.naturalHeight * (1 - headCropFrac);
          ctx.drawImage(img, 0, sy, img.naturalWidth, sh, -width / 2, -height / 2, width, height);
        }
        ctx.restore();
        // The collar/placket lines are a stand-in for missing detail in the flat-color
        // fallback — once we have a real segmented photo, it already shows real
        // buttons/collar, so drawing fake ones on top is redundant and looks wrong.
        if (!segmented && kind === 'top' && (item.type === 'Shirt' || item.type === undefined)) {
          ctx.globalAlpha = 1;
          drawCollarFlaps(ctx, width, height, null);
        }
      } else {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = item.color;
        if (kind === 'top') traceTopPath(ctx, item.type, width, height);
        else tracePantsPath(ctx, width, height);
        ctx.fill();
        if (kind === 'top' && (item.type === 'Shirt' || item.type === undefined)) {
          ctx.globalAlpha = 0.7;
          drawCollarFlaps(ctx, width, height, item.color);
        }
      }
      ctx.restore();
    }

    let lastDetectTime = 0;
    const DETECT_INTERVAL_MS = 120; // ~8 detections/sec — plenty for a live overlay, keeps main thread free

    function renderLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !canvas || !landmarker) return;

      if (segmentationBusyRef.current) {
        rafRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const now = performance.now();
      if (now - lastDetectTime < DETECT_INTERVAL_MS) {
        rafRef.current = requestAnimationFrame(renderLoop);
        return;
      }
      lastDetectTime = now;

      if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext('2d');
      if (ctx && video.videoWidth > 0) {
        const result = landmarker.detectForVideo(video, now);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const lm = result.landmarks[0];
        setNoPersonDetected(!lm);

        if (lm) {
          const W = canvas.width;
          const H = canvas.height;
          const nose = lm[POSE_LANDMARKS.NOSE];
          const ls = lm[POSE_LANDMARKS.LEFT_SHOULDER];
          const rs = lm[POSE_LANDMARKS.RIGHT_SHOULDER];
          const lh = lm[POSE_LANDMARKS.LEFT_HIP];
          const rh = lm[POSE_LANDMARKS.RIGHT_HIP];
          const lk = lm[POSE_LANDMARKS.LEFT_KNEE];
          const rk = lm[POSE_LANDMARKS.RIGHT_KNEE];
          const la = lm[POSE_LANDMARKS.LEFT_ANKLE];
          const ra = lm[POSE_LANDMARKS.RIGHT_ANKLE];

          if (DEBUG_LANDMARKS) {
            const dot = (p: NormalizedLandmark, color: string, label: string) => {
              const x = p.x * W;
              const y = p.y * H;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(x, y, 7, 0, Math.PI * 2);
              ctx.fill();
              // canvas is CSS-mirrored for display, so counter-flip just the text locally to keep it legible
              ctx.save();
              ctx.translate(x - 10, y);
              ctx.scale(-1, 1);
              ctx.font = 'bold 14px sans-serif';
              ctx.textAlign = 'left';
              ctx.fillText(`${label} ${p.visibility.toFixed(2)}`, 0, 0);
              ctx.restore();
            };
            dot(ls, '#00ff00', 'LS');
            dot(rs, '#ff00ff', 'RS');
            dot(lh, '#00ffff', 'LH');
            dot(rh, '#ffff00', 'RH');
            dot(nose, '#ff8800', 'NOSE');
          }

          const top = topItemRef.current;
          const bottom = bottomItemRef.current;

          // Only the shoulders are required for a top — hips are frequently out of
          // frame on a normal webcam (laptop distance, sitting), so fall back to a
          // shoulder-proportional torso height instead of skipping the overlay.
          const shoulderWidthFrac = Math.hypot(rs.x - ls.x, rs.y - ls.y);
          // A real shoulder line is never tilted this steeply in a normal selfie — if the
          // model reports an angle this extreme, it has very likely mislocated a shoulder
          // landmark. Better to draw nothing for this frame than draw a visibly wrong, skewed shape.
          // NB: a person's own right shoulder (rs) has a SMALLER x than their left shoulder (ls)
          // when facing the camera (mirror reasoning), so the "level" baseline uses (ls.x - rs.x),
          // not (rs.x - ls.x) — getting this backwards made every normal pose compute to ~180°.
          const rawShoulderAngle = Math.atan2((rs.y - ls.y) * H, (ls.x - rs.x) * W);
          const shoulderAnglePlausible = Math.abs(rawShoulderAngle) < (Math.PI / 180) * 35;
          if (
            top &&
            ls.visibility > MIN_VISIBILITY &&
            rs.visibility > MIN_VISIBILITY &&
            shoulderWidthFrac > 0.06 &&
            shoulderWidthFrac < 0.7 &&
            shoulderAnglePlausible
          ) {
            const shoulderMid = midpoint(ls, rs);
            const shoulderWidthPx = Math.hypot((rs.x - ls.x) * W, (rs.y - ls.y) * H);
            // A visible-but-wrong hip guess (common when hips are actually out of frame)
            // can drag the whole shirt sideways, since it's averaged into the center.
            // Only trust it if it's roughly where a real hip would be: below the
            // shoulders and not wildly offset to one side.
            const rawHipsVisible = lh.visibility > MIN_VISIBILITY && rh.visibility > MIN_VISIBILITY;
            const rawHipMid = rawHipsVisible ? midpoint(lh, rh) : null;
            const hipsVisible = rawHipMid !== null && rawHipMid.y > shoulderMid.y && Math.abs(rawHipMid.x - shoulderMid.x) < 0.18;
            const hipMid = hipsVisible ? rawHipMid! : { x: shoulderMid.x, y: shoulderMid.y + (shoulderWidthPx / W) * 1.3 };
            const angle = clamp(rawShoulderAngle, -Math.PI / 9, Math.PI / 9);
            const torsoHeightPx = hipsVisible
              ? Math.hypot((hipMid.x - shoulderMid.x) * W, (hipMid.y - shoulderMid.y) * H)
              : shoulderWidthPx * 1.3;
            const width = clamp(shoulderWidthPx * 1.9, W * 0.1, W * 0.85);
            // Kurtas are cut longer than a shirt — its silhouette path extends to 0.62h
            // instead of 0.5h, so it needs proportionally more height to read as "long."
            const lengthMultiplier = top.type === 'Kurta' ? 1.9 : 1.5;
            const height = clamp(torsoHeightPx * lengthMultiplier, H * 0.1, H * 0.85);
            // A real collar sits at the neck, noticeably above the shoulder line (not
            // AT it) — a fixed "6% of torso height" lift undershot this badly in
            // testing (rendered shirt started well below the actual neck). Use the
            // nose landmark to estimate neck height instead: the neck base sits most
            // of the way from the nose down to the shoulder line, not at the shoulders
            // themselves.
            const neckYNorm =
              nose.visibility > MIN_VISIBILITY
                ? nose.y + (shoulderMid.y - nose.y) * 0.68
                : shoulderMid.y - (shoulderWidthFrac * 0.35);
            const neckPx = { x: shoulderMid.x * W, y: neckYNorm * H };
            const center = { x: neckPx.x, y: neckPx.y + height / 2 };
            if (DEBUG_LANDMARKS) {
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(neckPx.x, neckPx.y, 9, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#000000';
              ctx.beginPath();
              ctx.arc(neckPx.x, neckPx.y, 4, 0, Math.PI * 2);
              ctx.fill();
            }
            drawOverlay(ctx, top, 'top', center, angle, width, height);
            if (DEBUG_LANDMARKS) {
              ctx.save();
              ctx.translate(center.x, center.y);
              ctx.rotate(angle);
              ctx.strokeStyle = 'red';
              ctx.lineWidth = 2;
              ctx.strokeRect(-width / 2, -height / 2, width, height);
              ctx.restore();
              console.log(
                '[top-debug] ' +
                  JSON.stringify({
                    canvasW: W,
                    canvasH: H,
                    shoulderWidthPx: Math.round(shoulderWidthPx),
                    torsoHeightPx: Math.round(torsoHeightPx),
                    boxWidth: Math.round(width),
                    boxHeight: Math.round(height),
                    hipsVisible,
                    lhVis: +lh.visibility.toFixed(2),
                    rhVis: +rh.visibility.toFixed(2),
                  })
              );
            }
          }

          const hipWidthFrac = Math.hypot(rh.x - lh.x, rh.y - lh.y);
          const rawHipAngle = Math.atan2((rh.y - lh.y) * H, (lh.x - rh.x) * W); // see shoulder note above re: mirrored x ordering
          const hipAnglePlausible = Math.abs(rawHipAngle) < (Math.PI / 180) * 35;
          if (
            bottom &&
            lh.visibility > MIN_VISIBILITY &&
            rh.visibility > MIN_VISIBILITY &&
            hipWidthFrac > 0.04 &&
            hipWidthFrac < 0.6 &&
            hipAnglePlausible
          ) {
            const hipMid = midpoint(lh, rh);
            const kneeMid = midpoint(lk, rk);
            const ankleMid = la.visibility > MIN_VISIBILITY && ra.visibility > MIN_VISIBILITY ? midpoint(la, ra) : null;
            const legEnd = ankleMid ?? { x: kneeMid.x, y: kneeMid.y + (kneeMid.y - hipMid.y) * 0.9 };
            const angle = clamp(rawHipAngle, -Math.PI / 9, Math.PI / 9);
            const hipWidthPx = Math.hypot((rh.x - lh.x) * W, (rh.y - lh.y) * H);
            const legLengthPx = Math.hypot((legEnd.x - hipMid.x) * W, (legEnd.y - hipMid.y) * H);
            const width = clamp(hipWidthPx * 1.7, W * 0.1, W * 0.8);
            const height = clamp(legLengthPx * 1.15, H * 0.1, H * 0.75);
            // Same fix as the shirt: the waistband should sit AT the hip line, not be
            // centered between hip and ankle (which pushed it up toward the navel).
            const hipPx = { x: hipMid.x * W, y: hipMid.y * H };
            const waistLift = height * 0.04;
            const center = { x: hipPx.x, y: hipPx.y - waistLift + height / 2 };
            drawOverlay(ctx, bottom, 'bottom', center, angle, width, height);
          }
        }
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = () => {
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    const overlay = canvasRef.current;
    if (!video || !overlay) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL('image/png'));
  };

  return (
    <div>
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
        <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
        {status === 'loading' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm">
            Loading live preview...
          </div>
        )}
        {status === 'ready' && noPersonDetected && (
          <div className="absolute bottom-2 inset-x-0 text-center text-xs text-white bg-black/50 py-1">
            Step back so your shoulders and hips are visible
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-sm px-6 text-center">
            {error}
          </div>
        )}
      </div>
      {status === 'ready' && (
        <button
          onClick={handleCapture}
          className="mt-4 w-full px-5 py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          📸 Capture This Look (leaves live view)
        </button>
      )}
      <p className="text-xs text-slate-400 mt-2">
        This is a quick, free color/style preview — a simplified outline, not a real rendering of the fabric, so
        it won't look photorealistic for any item. For an actual photo of yourself wearing this exact item,
        capture a look and use <strong>"Generate Real AI Try-On."</strong>
      </p>
    </div>
  );
}
