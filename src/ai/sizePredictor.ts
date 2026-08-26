import type { Gender } from '../types';
import type { BodyMeasurement } from './bodyMeasurement';

export interface SizePrediction {
  shirtSize: string;
  pantSize: string;
  confidence: number;
  note?: string;
  photoRefined?: boolean;
}

// Was previously a linear formula (`weight*0.6 + (height-150)*0.3`) that
// massively overestimated waist size — it hit the 44" clamp ceiling for
// almost any adult over ~60kg (e.g. 65kg/170cm, a perfectly normal BMI of
// 22.5, still came out as 44" before clamping reached 46"). Banding off BMI
// instead — same signal already driving shirtSize above — keeps the two
// consistent and matches real-world waist sizes far better (verified against
// a user-reported real pant size of 36" at BMI 26.7, where the old formula
// gave 44").
function waistFromBmi(bmi: number): number {
  if (bmi < 18.5) return 28;
  if (bmi < 21) return 30;
  if (bmi < 23) return 32;
  if (bmi < 25) return 34;
  if (bmi < 27) return 36;
  if (bmi < 29) return 38;
  if (bmi < 32) return 40;
  if (bmi < 35) return 42;
  return 44;
}

export function predictSize(height: number, weight: number, gender: Gender): SizePrediction {
  const bmi = weight / Math.pow(height / 100, 2);

  let shirtSize = 'M';
  if (bmi < 18.5) shirtSize = gender === 'Kids' ? 'S' : 'S';
  else if (bmi < 23) shirtSize = 'M';
  else if (bmi < 27) shirtSize = 'L';
  else if (bmi < 32) shirtSize = 'XL';
  else shirtSize = 'XXL';

  const pantSize = gender === 'Kids'
    ? `${Math.max(4, Math.round(height / 15))}-${Math.max(5, Math.round(height / 15) + 1)}Y`
    : `${waistFromBmi(bmi)}`;

  return {
    shirtSize,
    pantSize,
    confidence: 0.85,
  };
}

const SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

// Rough shoulder-width-by-shirt-size reference, in cm — approximate and varies
// by brand/cut, used only to sanity-check the BMI-based guess against an
// actual body measurement, not as an authoritative size chart.
function shirtSizeFromShoulderWidth(cm: number): string {
  if (cm < 40) return 'S';
  if (cm < 44) return 'M';
  if (cm < 48) return 'L';
  if (cm < 52) return 'XL';
  return 'XXL';
}

// Crude hip-width -> waist-size proxy (same approximation caveat as above).
function pantSizeFromHipWidth(cm: number): number {
  const waist = Math.round((cm * 1.15) / 2) * 2;
  return Math.max(28, Math.min(44, waist));
}

// Combines the BMI-based estimate with an actual body measurement from a
// photo. Shoulder/hip width is a harder physical constraint than BMI alone —
// BMI can't tell a broad-shouldered frame from a narrow one at the same
// height/weight — so when they disagree by one size step, this trusts the
// photo measurement's larger size (fewer "too tight" returns). When they
// disagree by more than that, the photo measurement is more likely to be
// noisy (bad angle, partial body) than the person's actual size, so it falls
// back to the BMI-only estimate and flags low confidence instead of guessing.
export function refineSizeWithMeasurement(base: SizePrediction, measurement: BodyMeasurement, gender: Gender): SizePrediction {
  if (gender === 'Kids') return base; // reference widths above are tuned for adult proportions only

  const photoShirtSize = shirtSizeFromShoulderWidth(measurement.shoulderWidthCm);
  const photoPantSize = pantSizeFromHipWidth(measurement.hipWidthCm);

  const shirtDiff = Math.abs(SHIRT_SIZES.indexOf(base.shirtSize) - SHIRT_SIZES.indexOf(photoShirtSize));
  const pantDiff = Math.abs(Number(base.pantSize) - photoPantSize);

  const shirtAgrees = shirtDiff <= 1;
  const pantAgrees = pantDiff <= 4; // pant sizes step by 2 — 4 is "one step" of slack

  const shirtSize = shirtAgrees
    ? SHIRT_SIZES[Math.max(SHIRT_SIZES.indexOf(base.shirtSize), SHIRT_SIZES.indexOf(photoShirtSize))]
    : base.shirtSize;
  const pantSize = pantAgrees ? String(Math.max(Number(base.pantSize), photoPantSize)) : base.pantSize;

  const agreementCount = (shirtAgrees ? 1 : 0) + (pantAgrees ? 1 : 0);
  const exactMatch = shirtDiff === 0 && pantDiff === 0;
  const confidence = exactMatch ? 0.93 : agreementCount === 2 ? 0.82 : agreementCount === 1 ? 0.7 : 0.55;

  // Surfacing the raw measured numbers (not just a vague "disagreed a lot")
  // so a confusing result is at least diagnosable — e.g. "measured shoulder
  // 53cm" is an obvious red flag (bad pose/angle) vs. a plausible-but-different
  // number, which would instead suggest the size reference tables need tuning.
  const measured = `(measured: shoulder ~${Math.round(measurement.shoulderWidthCm)}cm, hip ~${Math.round(measurement.hipWidthCm)}cm)`;

  let note: string;
  if (exactMatch) {
    note = `Your photo measurement matched your height & weight estimate closely. ${measured}`;
  } else if (agreementCount > 0) {
    note = `Your photo suggested a roomier fit in some places — sized up where they disagreed to fit comfortably. ${measured}`;
  } else {
    note = `Your photo measurement and height/weight estimate disagreed by a lot — for a tighter estimate, try a clearer full-body photo standing further back, facing the camera directly. ${measured}`;
  }

  return { shirtSize, pantSize, confidence, note, photoRefined: true };
}
