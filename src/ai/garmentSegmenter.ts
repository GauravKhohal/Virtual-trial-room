import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';

// selfie_multiclass category indices, per MediaPipe docs
const CATEGORY_CLOTHES = 4;

let segmenterPromise: Promise<ImageSegmenter> | null = null;

function getGarmentSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const wasmFileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      // CPU delegate — running this with a GPU delegate alongside the pose
      // landmarker's own GPU-backed WebGL context caused unreliable hangs in
      // testing (two concurrent MediaPipe tasks contending for the same GPU
      // context). The caller also pauses pose detection while this runs
      // (see LiveTryOn's segmentationBusyRef) as the two tasks hang each other
      // even on CPU if both run their detection loop at the same instant.
      return await ImageSegmenter.createFromOptions(wasmFileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
    })().catch((err) => {
      segmenterPromise = null;
      throw err;
    });
  }
  return segmenterPromise;
}

// A photo of a model wearing a shirt often has hands/arms crossed in front of
// it; the segmenter correctly labels those as "body-skin", which would
// otherwise punch a see-through hole right through the middle of the garment.
// Flood-fill non-clothes pixels in from the mask's border — anything non-clothes
// NOT reachable from the border is an enclosed hole, surrounded by clothes, and
// gets patched (treated as clothes) instead of left transparent.
function buildEffectiveClothesGrid(maskData: Uint8Array, maskW: number, maskH: number): Uint8Array {
  const isClothes = new Uint8Array(maskW * maskH);
  for (let i = 0; i < maskData.length; i++) {
    isClothes[i] = maskData[i] === CATEGORY_CLOTHES ? 1 : 0;
  }

  const reachableFromBorder = new Uint8Array(maskW * maskH);
  const queue: number[] = [];
  const visitIfBackground = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= maskW || y >= maskH) return;
    const idx = y * maskW + x;
    if (isClothes[idx] || reachableFromBorder[idx]) return;
    reachableFromBorder[idx] = 1;
    queue.push(idx);
  };
  for (let x = 0; x < maskW; x++) {
    visitIfBackground(x, 0);
    visitIfBackground(x, maskH - 1);
  }
  for (let y = 0; y < maskH; y++) {
    visitIfBackground(0, y);
    visitIfBackground(maskW - 1, y);
  }
  while (queue.length) {
    const idx = queue.pop()!;
    const x = idx % maskW;
    const y = (idx / maskW) | 0;
    visitIfBackground(x - 1, y);
    visitIfBackground(x + 1, y);
    visitIfBackground(x, y - 1);
    visitIfBackground(x, y + 1);
  }

  const effective = new Uint8Array(maskW * maskH);
  for (let i = 0; i < effective.length; i++) {
    effective[i] = isClothes[i] || !reachableFromBorder[i] ? 1 : 0;
  }
  return effective;
}

// Isolates just the "clothes" pixels from a garment photo (which is typically an
// on-model shot, not a flat-lay) using real per-pixel segmentation instead of a
// guessed crop percentage. Non-clothes pixels (head, hair, skin, background)
// become fully transparent in the returned canvas.
export async function segmentGarmentFromPhoto(img: HTMLImageElement): Promise<HTMLCanvasElement> {
  const segmenter = await getGarmentSegmenter();
  const result = segmenter.segment(img);
  const mask = result.categoryMask;
  if (!mask) {
    result.close();
    throw new Error('Segmentation produced no category mask');
  }

  const maskData = mask.getAsUint8Array();
  const maskW = mask.width;
  const maskH = mask.height;
  const effectiveClothes = buildEffectiveClothesGrid(maskData, maskW, maskH);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // A filled hole (e.g. clasped hands in front of the shirt) has no real fabric
  // pixels to show — left as-is it shows actual skin tone in the middle of the
  // garment, which reads as wrong as the transparent hole it replaces. Recolor
  // those pixels to the garment's own average color instead of leaving them
  // skin-toned. First pass: classify pixels and accumulate the clothes average.
  const maskAt = (x: number, y: number) => {
    const my = Math.min(maskH - 1, Math.floor((y / canvas.height) * maskH));
    const mx = Math.min(maskW - 1, Math.floor((x / canvas.width) * maskW));
    return my * maskW + mx;
  };

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let clothesCount = 0;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (maskData[maskAt(x, y)] === CATEGORY_CLOTHES) {
        const i = (y * canvas.width + x) * 4;
        sumR += pixels[i];
        sumG += pixels[i + 1];
        sumB += pixels[i + 2];
        clothesCount++;
      }
    }
  }
  const avgColor: [number, number, number] = clothesCount > 0 ? [sumR / clothesCount, sumG / clothesCount, sumB / clothesCount] : [128, 128, 128];

  // Track the bounding box of actual clothes pixels — the source photo usually
  // has a head/neck region above the garment that's now fully transparent, and
  // drawing the full (mostly-empty) frame into the overlay box would squeeze the
  // visible garment into a fraction of it instead of filling it.
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = maskAt(x, y);
      const i = (y * canvas.width + x) * 4;
      if (effectiveClothes[idx]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (maskData[idx] !== CATEGORY_CLOTHES) {
          // a patched hole — recolor to the garment's average color
          pixels[i] = avgColor[0];
          pixels[i + 1] = avgColor[1];
          pixels[i + 2] = avgColor[2];
        }
      } else {
        pixels[i + 3] = 0;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  result.close();

  if (maxX <= minX || maxY <= minY) {
    throw new Error('No clothes pixels found in segmentation');
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = document.createElement('canvas');
  cropped.width = cropW;
  cropped.height = cropH;
  cropped.getContext('2d')!.putImageData(imageData, -minX, -minY);
  return cropped;
}
