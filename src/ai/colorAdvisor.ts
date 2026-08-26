export interface ColorVerdict {
  name: string;
  hex: string;
}

export interface ColorAdviceResult {
  skinTone: string;
  best: ColorVerdict[];
  avoid: ColorVerdict[];
}

const PALETTES: ColorAdviceResult[] = [
  {
    skinTone: 'Warm Medium',
    best: [
      { name: 'Navy Blue', hex: '#1b2a4a' },
      { name: 'Olive Green', hex: '#5c5f2e' },
      { name: 'Maroon', hex: '#6e1f2a' },
      { name: 'White', hex: '#f8f8f6' },
    ],
    avoid: [
      { name: 'Neon Yellow', hex: '#e6ff1c' },
      { name: 'Bright Orange', hex: '#ff6a1f' },
    ],
  },
  {
    skinTone: 'Cool Fair',
    best: [
      { name: 'Royal Blue', hex: '#1f4e96' },
      { name: 'Charcoal Grey', hex: '#3a3a3c' },
      { name: 'Emerald Green', hex: '#1f5c46' },
      { name: 'Pastel Pink', hex: '#e9b9c4' },
    ],
    avoid: [
      { name: 'Mustard', hex: '#c79a2b' },
      { name: 'Neon Yellow', hex: '#e6ff1c' },
    ],
  },
  {
    skinTone: 'Deep',
    best: [
      { name: 'White', hex: '#f8f8f6' },
      { name: 'Mustard', hex: '#c79a2b' },
      { name: 'Red', hex: '#b3202c' },
      { name: 'Beige', hex: '#e3d2b4' },
    ],
    avoid: [
      { name: 'Pastel Pink', hex: '#e9b9c4' },
      { name: 'Charcoal Grey', hex: '#3a3a3c' },
    ],
  },
];

// Mock "vision AI" — deterministic pseudo-analysis seeded from image data size,
// standing in for a real Gemini Vision / GPT-4V call.
export async function analyzeSkinToneAndColors(imageData: string): Promise<ColorAdviceResult> {
  await new Promise((r) => setTimeout(r, 900));
  const seed = imageData.length % PALETTES.length;
  return PALETTES[seed];
}
