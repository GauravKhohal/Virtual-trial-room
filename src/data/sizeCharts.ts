// Brand/model-specific garment size charts, transcribed from the shop's
// measurement sheets ("jeans size specification", "jeans waste size" and
// "Shirt Specification" PDFs). All measurements are in inches, taken from the
// actual garments — NOT body measurements. The same labeled size fits very
// differently across models (e.g. a size-34 Levi's 513 has a 36" garment
// waist while a 517 has 34"), which is exactly why a generic "you are a 34"
// recommendation produces size-exchange returns. The matcher in
// ai/garmentSizeMatcher.ts picks a size off these garment numbers instead.

// Fit preferences as listed in the "Flow of Garment selection" sheet.
export const JEANS_FIT_PREFERENCES = [
  'Slim/Regular',
  'Super Skinny',
  'Tapered Fit',
  'Classic Slim',
  'Boot Cut',
  'Straight Fit',
  'Super Loose Fit',
  'Wide Leg',
] as const;
export type JeansFitPreference = (typeof JEANS_FIT_PREFERENCES)[number];

export interface JeansSizeSpec {
  /** Labeled waist size on the tag (30, 32, ...) */
  label: number;
  /** Actual garment waist circumference, inches */
  waist: number;
  length: number;
  /** Rise ("mori" on the shop's sheets) */
  mori: number;
  thighs: number;
  hips: number;
}

export interface JeansModelChart {
  brand: string;
  model: string;
  fits: JeansFitPreference[];
  rise?: 'Low Rise' | 'Mid Rise' | 'High Rise';
  /**
   * Detailed garment measurements per size. Models the shop stocks but has
   * not yet measured (Numero Uno, USPA Cole Tapered) have no chart — the
   * matcher falls back to label = body waist for those.
   */
  sizes: JeansSizeSpec[] | null;
  /** Labeled sizes carried when there's no measurement chart. */
  availableLabels?: number[];
}

// Column order in every block below follows the sheet: sizes 30→44.
const spec = (
  label: number,
  waist: number,
  length: number,
  mori: number,
  thighs: number,
  hips: number
): JeansSizeSpec => ({ label, waist, length, mori, thighs, hips });

export const JEANS_MODEL_CHARTS: JeansModelChart[] = [
  {
    brand: "Levi's",
    model: '511 Slim',
    fits: ['Slim/Regular', 'Classic Slim'],
    sizes: [
      spec(30, 31, 41, 13.5, 22.5, 37.5),
      spec(32, 33, 43, 14, 23.5, 40),
      spec(34, 35, 42.5, 15, 24.5, 42),
      spec(36, 37, 44.5, 15, 25, 42.5),
      spec(38, 39, 44.5, 16, 26, 43),
      spec(40, 41, 45.65, 16.5, 26.86, 45),
      spec(42, 43, 46.5, 17.1, 27.67, 46.4),
      spec(44, 45, 47.33, 17.7, 28.56, 47.75),
    ],
  },
  {
    brand: "Levi's",
    model: '513 Slim Straight',
    fits: ['Slim/Regular', 'Straight Fit'],
    sizes: [
      spec(30, 32, 41, 14.5, 22, 37),
      spec(32, 33, 42, 16, 22.5, 38.5),
      spec(34, 36, 43.5, 16, 25, 41),
      spec(36, 38, 44, 16.5, 26, 44),
      spec(38, 40, 45, 17, 26, 44),
      spec(40, 42.11, 46.1, 17.67, 27.75, 46.75),
      spec(42, 44.2, 47.1, 18.2, 28.89, 48.71),
      spec(44, 46.3, 48.11, 18.75, 30.05, 50.65),
    ],
  },
  {
    brand: "Levi's",
    model: '541 Athletic Taper',
    fits: ['Tapered Fit'],
    sizes: [
      spec(30, 31, 42, 14.5, 22, 39),
      spec(32, 33, 43, 15.5, 26, 43),
      spec(34, 36, 44, 16, 26, 44),
      spec(36, 37.5, 41.5, 16, 26.5, 44),
      spec(38, 40, 43, 16.5, 27, 46),
      spec(40, 42.25, 42.85, 17, 28.65, 47.71),
      spec(42, 44.5, 42.9, 17.5, 29.7, 49.2),
      spec(44, 46.75, 42.95, 17.95, 30.75, 50.7),
    ],
  },
  {
    brand: "Levi's",
    model: '505 Regular',
    fits: ['Slim/Regular', 'Straight Fit'],
    sizes: [
      spec(30, 31.5, 43, 14, 22.5, 38),
      spec(32, 32, 41.5, 15.5, 24, 40),
      spec(34, 35, 44, 16, 25, 42),
      spec(36, 37, 45, 16, 25, 43),
      spec(38, 40, 46, 17, 27, 46),
      spec(40, 42.5, 46.75, 17.65, 27.67, 47.5),
      spec(42, 45.1, 47.71, 18.33, 28.7, 49.4),
      spec(44, 47.7, 48.65, 18.95, 29.7, 51.3),
    ],
  },
  {
    brand: "Levi's",
    model: '517 Bootcut',
    fits: ['Boot Cut'],
    sizes: [
      spec(30, 31, 40.5, 16.5, 23, 39),
      spec(32, 33, 41, 18, 25, 41),
      spec(34, 34, 43, 18, 26, 41),
      spec(36, 37, 41.5, 20, 27, 44),
      spec(38, 38.5, 42.75, 20.75, 28.5, 45),
      spec(40, 40.4, 43.25, 21.8, 29.8, 46.5),
      spec(42, 42.3, 43.75, 22.85, 31.1, 48),
      spec(44, 44.2, 44.25, 23.9, 32.4, 49.5),
    ],
  },
  {
    brand: "Levi's",
    model: '527 Bootcut',
    fits: ['Boot Cut'],
    sizes: [
      spec(30, 32, 41.5, 16, 23, 40),
      spec(32, 33, 44.5, 18, 24, 41),
      spec(34, 35, 42, 18, 24, 41),
      spec(36, 37, 44, 18, 26, 44),
      spec(38, 38.5, 44.25, 19, 26.5, 44.5),
      spec(40, 40.2, 44.75, 19.6, 27.4, 45.7),
      spec(42, 41.9, 45.25, 20.2, 28.3, 46.9),
      spec(44, 43.6, 45.75, 20.8, 29.2, 48.1),
    ],
  },
  {
    brand: "Levi's",
    model: '555 Relaxed Straight',
    fits: ['Straight Fit', 'Super Loose Fit'],
    sizes: [
      spec(30, 32, 42, 16, 24, 40),
      spec(32, 33, 43, 17, 26, 40),
      spec(34, 35, 43, 18, 26.5, 41),
      spec(36, 37, 43, 18, 27, 44.5),
      spec(38, 38.5, 43.5, 19, 28.25, 45),
      spec(40, 40.2, 43.8, 19.7, 29.2, 46.45),
      spec(42, 41.9, 44.1, 20.4, 30.14, 47.9),
      spec(44, 43.6, 44.4, 21.1, 31.1, 49.33),
    ],
  },
  {
    brand: "Levi's",
    model: '568 Loose Straight',
    fits: ['Super Loose Fit', 'Straight Fit'],
    sizes: [
      spec(30, 32.5, 44, 16, 23, 41),
      spec(32, 34, 44, 17, 26, 41),
      spec(34, 36, 44, 18, 27, 42),
      spec(36, 38.5, 45, 17.5, 28, 45),
      spec(38, 40.25, 45, 18.5, 30, 45.5),
      spec(40, 42.25, 45.3, 19.05, 31.6, 46.8),
      spec(42, 44.25, 45.6, 19.6, 33.2, 48.1),
      spec(44, 46.25, 45.9, 20.14, 34.8, 49.4),
    ],
  },
  {
    brand: 'USPA',
    model: 'Brandon Slim',
    fits: ['Slim/Regular', 'Classic Slim'],
    sizes: [
      spec(30, 31, 40, 12.5, 23, 38),
      spec(32, 33, 41, 14, 24, 40),
      spec(34, 35, 41, 13.5, 24, 41),
      spec(36, 37, 41, 13.5, 25, 42),
      spec(38, 39, 41.5, 14, 25.5, 43.5),
      spec(40, 41, 41.8, 14.25, 26.1, 44.8),
      spec(42, 43, 42.1, 14.5, 26.7, 46.1),
      spec(44, 45, 42.4, 14.75, 27.3, 47.4),
    ],
  },
  {
    brand: 'USPA',
    model: 'Harold Slim Straight',
    fits: ['Slim/Regular', 'Straight Fit'],
    sizes: [
      spec(30, 31, 40, 14.5, 23, 38),
      spec(32, 33, 42.5, 15, 24, 39),
      spec(34, 35, 42, 15.5, 25, 41),
      spec(36, 37, 42, 15.5, 26, 43),
      spec(38, 39, 43, 16, 27, 44),
      spec(40, 41, 43.55, 16.33, 28, 45.8),
      spec(42, 43, 44.11, 16.7, 29, 47.4),
      spec(44, 45, 44.65, 17, 30, 49),
    ],
  },
  {
    brand: 'USPA',
    model: 'Connor Bootcut',
    fits: ['Boot Cut'],
    sizes: [
      spec(30, 31, 41, 16, 23.5, 39),
      spec(32, 32, 42, 17, 24, 40),
      spec(34, 34, 43, 17.5, 25, 41),
      spec(36, 36.5, 43, 18, 26, 42),
      spec(38, 39, 43, 18.5, 27, 44),
      spec(40, 40.65, 43.9, 19.2, 27.8, 44.8),
      spec(42, 42.7, 44.4, 19.8, 28.7, 46),
      spec(44, 44.75, 44.9, 20.4, 29.6, 47.2),
    ],
  },
  {
    brand: 'USPA',
    model: 'Logan Loose Fit',
    fits: ['Super Loose Fit'],
    sizes: [
      spec(30, 31, 42, 17, 25, 40),
      spec(32, 33.5, 44, 18, 26, 41),
      spec(34, 35, 43, 19, 27, 42),
      spec(36, 38, 44, 19.5, 28, 46),
      spec(38, 40, 44.5, 20.5, 29, 47),
      spec(40, 42.25, 45, 21.35, 30, 48.9),
      spec(42, 44.5, 45.5, 22.2, 31, 50.8),
      spec(44, 46.75, 46, 23, 32, 52.7),
    ],
  },
  {
    brand: 'USPA',
    model: 'Shawan Relaxed Fit',
    fits: ['Super Loose Fit', 'Straight Fit'],
    sizes: [
      spec(30, 31, 40, 15, 24, 39),
      spec(32, 33, 41, 16, 25, 40),
      spec(34, 36, 42, 17, 26, 42),
      spec(36, 38, 43, 18, 27, 44),
      spec(38, 40.5, 44, 19, 28, 45.5),
      spec(40, 42.9, 45, 20, 29, 47.2),
      spec(42, 45.3, 46, 21, 30, 48.9),
      spec(44, 47.7, 47, 22, 31, 50.6),
    ],
  },
  // Stocked models without a measured chart yet — matched by tag label only.
  {
    brand: 'USPA',
    model: 'Cole Tapered',
    fits: ['Tapered Fit'],
    sizes: null,
    availableLabels: [30, 32, 34, 36, 38, 40, 42, 44],
  },
  {
    brand: 'Numero Uno',
    model: 'David Super Skinny',
    fits: ['Super Skinny'],
    rise: 'Low Rise',
    sizes: null,
    availableLabels: [30, 32, 34, 36],
  },
  {
    brand: 'Numero Uno',
    model: 'Martin Tapered Slim',
    fits: ['Tapered Fit'],
    rise: 'Low Rise',
    sizes: null,
    availableLabels: [30, 32, 34, 36],
  },
  {
    brand: 'Numero Uno',
    model: 'Morice Classic Slim',
    fits: ['Classic Slim', 'Slim/Regular'],
    rise: 'Mid Rise',
    sizes: null,
    availableLabels: [28, 30, 32, 34],
  },
  {
    brand: 'Numero Uno',
    model: 'Frazer Straight',
    fits: ['Straight Fit'],
    rise: 'Mid Rise',
    sizes: null,
    availableLabels: [28, 30, 32, 34],
  },
  {
    brand: 'Numero Uno',
    model: 'Darke High Wide Hem',
    fits: ['Wide Leg', 'Super Loose Fit'],
    rise: 'High Rise',
    sizes: null,
    availableLabels: [26, 28, 30, 32, 34],
  },
];

export const JEANS_CHART_BRANDS: string[] = [...new Set(JEANS_MODEL_CHARTS.map((m) => m.brand))];

// Waist label ↔ letter size, per the shop's "waist size" sheet
// (30=S, 32=M, ... 44=XXXXXL — shown as 3XL/4XL/5XL for readability).
const WAIST_LETTER: Record<number, string> = {
  28: 'XS',
  30: 'S',
  32: 'M',
  34: 'L',
  36: 'XL',
  38: 'XXL',
  40: '3XL',
  42: '4XL',
  44: '5XL',
};
export function letterForWaistLabel(label: number): string | undefined {
  return WAIST_LETTER[label];
}

// ---------------------------------------------------------------------------
// Shirts

export type ShirtFitPreference = 'Slim Fit' | 'Regular Fit';

export const SHIRT_LETTER_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

export interface ShirtSizeSpec {
  size: string;
  /** Collar ("tira" on the sheet), inches */
  tira: number;
  /** Chest, garment laid flat (double for circumference), inches */
  chest: number;
  length: number;
  sleeveLength: number;
  waist: number;
}

// Levi's shirt garment measurements (S–XXL) from the Shirt Specification sheet.
export const LEVIS_SHIRT_CHART: ShirtSizeSpec[] = [
  { size: 'S', tira: 17.5, chest: 21, length: 26, sleeveLength: 24.5, waist: 20.5 },
  { size: 'M', tira: 18.5, chest: 22, length: 27.5, sleeveLength: 25.5, waist: 21 },
  { size: 'L', tira: 19, chest: 23.5, length: 28, sleeveLength: 25.5, waist: 23 },
  { size: 'XL', tira: 20, chest: 23.5, length: 29.5, sleeveLength: 26.5, waist: 23.5 },
  { size: 'XXL', tira: 21.5, chest: 26.5, length: 30, sleeveLength: 27, waist: 26 },
];

/**
 * Per the sheet's generic shirt table, slim-fit sizing aligns 1:1 with the
 * base size (S..3XL) while regular fit is offset one column: the body that
 * takes M in slim fit takes S in regular fit (regular is cut roomier, so the
 * smaller tag gives the same room). Returns the tag size to pull for the
 * chosen fit, or the base size when the shift runs off the chart.
 */
export function shirtSizeForFit(baseSize: string, fit: ShirtFitPreference): string {
  if (fit === 'Slim Fit') return baseSize;
  const i = SHIRT_LETTER_SIZES.indexOf(baseSize as (typeof SHIRT_LETTER_SIZES)[number]);
  return i > 0 ? SHIRT_LETTER_SIZES[i - 1] : baseSize;
}
