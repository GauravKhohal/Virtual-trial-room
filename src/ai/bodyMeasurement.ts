import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { POSE_LANDMARKS } from './poseLandmarker';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

// Deliberately a separate PoseLandmarker instance from the one in
// poseLandmarker.ts — that one is locked to runningMode 'VIDEO' for
// LiveTryOn's continuous detection loop, and running two MediaPipe tasks
// concurrently against a shared instance is exactly what caused the
// segmenter/landmarker hang documented in LiveTryOn. This page is never open
// at the same time as Trial Room, but keeping the instances fully separate
// avoids that risk entirely rather than relying on timing.
let imageLandmarkerPromise: Promise<PoseLandmarker> | null = null;
function getImagePoseLandmarker(): Promise<PoseLandmarker> {
  if (!imageLandmarkerPromise) {
    imageLandmarkerPromise = (async () => {
      const wasmFileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      try {
        return await PoseLandmarker.createFromOptions(wasmFileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'IMAGE',
          numPoses: 1,
        });
      } catch {
        return PoseLandmarker.createFromOptions(wasmFileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
          runningMode: 'IMAGE',
          numPoses: 1,
        });
      }
    })().catch((err) => {
      imageLandmarkerPromise = null;
      throw err;
    });
  }
  return imageLandmarkerPromise;
}

export interface BodyMeasurement {
  shoulderWidthCm: number;
  hipWidthCm: number;
}

const MIN_VISIBILITY = 0.5;
// A single 2D photo has no absolute scale of its own — we back one out from
// the user's stated height. Nose-to-ankle-midpoint distance is, on average,
// roughly 88% of total standing height (the rest being the top of the head,
// which the model doesn't land a point on). This is a population average,
// not a measurement of this specific person, so treat results as estimates.
const NOSE_TO_ANKLE_HEIGHT_FRACTION = 0.88;

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Returns null if a full body wasn't clearly visible (missing/low-confidence
// shoulders, hips, ankles, or nose) — callers should fall back to the
// height/weight-only estimate rather than trust a measurement built on a
// guessed landmark position.
export async function measureBodyFromImage(image: HTMLImageElement, statedHeightCm: number): Promise<BodyMeasurement | null> {
  const landmarker = await getImagePoseLandmarker();
  const result = landmarker.detect(image);
  const landmarks = result.landmarks?.[0];
  if (!landmarks) return null;

  const L = POSE_LANDMARKS;
  const required = [L.NOSE, L.LEFT_SHOULDER, L.RIGHT_SHOULDER, L.LEFT_HIP, L.RIGHT_HIP, L.LEFT_ANKLE, L.RIGHT_ANKLE];
  const allVisible = required.every((i) => (landmarks[i]?.visibility ?? 0) >= MIN_VISIBILITY);
  if (!allVisible) return null;

  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const px = (i: number) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h });

  const nose = px(L.NOSE);
  const lShoulder = px(L.LEFT_SHOULDER);
  const rShoulder = px(L.RIGHT_SHOULDER);
  const lHip = px(L.LEFT_HIP);
  const rHip = px(L.RIGHT_HIP);
  const lAnkle = px(L.LEFT_ANKLE);
  const rAnkle = px(L.RIGHT_ANKLE);
  const ankleMid = { x: (lAnkle.x + rAnkle.x) / 2, y: (lAnkle.y + rAnkle.y) / 2 };

  const noseToAnklePx = dist(nose, ankleMid);
  if (noseToAnklePx < 1) return null;

  const cmPerPixel = (statedHeightCm * NOSE_TO_ANKLE_HEIGHT_FRACTION) / noseToAnklePx;

  return {
    shoulderWidthCm: dist(lShoulder, rShoulder) * cmPerPixel,
    hipWidthCm: dist(lHip, rHip) * cmPerPixel,
  };
}
