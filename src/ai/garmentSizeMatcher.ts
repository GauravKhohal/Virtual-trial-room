import {
  JEANS_MODEL_CHARTS,
  LEVIS_SHIRT_CHART,
  letterForWaistLabel,
  shirtSizeForFit,
  type JeansFitPreference,
  type JeansModelChart,
  type JeansSizeSpec,
  type ShirtFitPreference,
  type ShirtSizeSpec,
} from '../data/sizeCharts';

// A little breathing room between body waist and garment waist — a garment
// whose waist exactly equals the body measurement buttons but feels tight
// seated. Half an inch is deliberately small: the goal is "smallest size that
// truly fits", since sizing up is the other common cause of exchanges.
const WAIST_EASE_IN = 0.5;

export interface JeansSizeMatch {
  brand: string;
  model: string;
  rise?: string;
  /** Tag size to pull off the shelf, e.g. "34" */
  sizeLabel: number;
  /** Letter equivalent per the shop's mapping, e.g. "L" */
  letterSize?: string;
  /** Matched garment measurements when the model has a measured chart */
  spec?: JeansSizeSpec;
  /**
   * True when the pick came from the model's measured garment chart; false
   * means the model has no chart yet and the tag label was matched to body
   * waist directly (still correct-by-convention, but unverified).
   */
  fromChart: boolean;
  /** Set when even the largest measured size is smaller than the body waist */
  outOfRange?: boolean;
}

function matchModel(model: JeansModelChart, bodyWaistIn: number): JeansSizeMatch | null {
  if (model.sizes) {
    const target = bodyWaistIn + WAIST_EASE_IN;
    const fitting = model.sizes.find((s) => s.waist >= target);
    const pick = fitting ?? model.sizes[model.sizes.length - 1];
    return {
      brand: model.brand,
      model: model.model,
      rise: model.rise,
      sizeLabel: pick.label,
      letterSize: letterForWaistLabel(pick.label),
      spec: pick,
      fromChart: true,
      outOfRange: !fitting,
    };
  }

  if (model.availableLabels?.length) {
    // No garment chart — fall back to the tag-label convention (label ≈ body
    // waist), rounding up to the next even label the model actually carries.
    const fitting = model.availableLabels.find((l) => l >= bodyWaistIn);
    if (!fitting) return null; // body waist beyond this model's range — don't suggest a size that won't close
    return {
      brand: model.brand,
      model: model.model,
      rise: model.rise,
      sizeLabel: fitting,
      letterSize: letterForWaistLabel(fitting),
      fromChart: false,
    };
  }

  return null;
}

/**
 * Recommends the exact tag size per jeans model for a given body waist,
 * filtered by the customer's fit preference (and optionally brand). Sorted
 * with chart-verified matches first, snuggest actual garment waist first —
 * the top result is the best "will not come back for exchange" pick.
 */
export function recommendJeansSizes(
  bodyWaistIn: number,
  fit: JeansFitPreference,
  brand?: string
): JeansSizeMatch[] {
  return JEANS_MODEL_CHARTS.filter(
    (m) => m.fits.includes(fit) && (!brand || m.brand === brand)
  )
    .map((m) => matchModel(m, bodyWaistIn))
    .filter((m): m is JeansSizeMatch => m !== null)
    .sort((a, b) => {
      if (a.fromChart !== b.fromChart) return a.fromChart ? -1 : 1;
      if (a.outOfRange !== b.outOfRange) return a.outOfRange ? 1 : -1;
      const aw = a.spec?.waist ?? a.sizeLabel;
      const bw = b.spec?.waist ?? b.sizeLabel;
      return aw - bw;
    });
}

export interface ShirtSizeMatch {
  /** Tag size to pull for the chosen fit (already fit-adjusted) */
  size: string;
  fit: ShirtFitPreference;
  /** Levi's garment measurements for that tag size, when available */
  spec?: ShirtSizeSpec;
}

/**
 * Converts the generic predicted shirt size (from ai/sizePredictor) into the
 * tag size to pull for a slim vs regular cut, with Levi's garment
 * measurements attached for on-the-spot verification.
 */
export function recommendShirtSize(baseSize: string, fit: ShirtFitPreference): ShirtSizeMatch {
  const size = shirtSizeForFit(baseSize, fit);
  return {
    size,
    fit,
    spec: LEVIS_SHIRT_CHART.find((s) => s.size === size),
  };
}
