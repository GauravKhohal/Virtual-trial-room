import type { ClothingType } from '../types';

const ICONS: Record<ClothingType, string> = {
  Shirt: '👔',
  'T-Shirt': '👕',
  Jeans: '👖',
  Trousers: '👖',
  Kurta: '🥻',
  Suit: '🤵',
  Blazer: '🧥',
  Saree: '🥻',
  Lehenga: '👗',
};

export default function GarmentSwatch({
  type,
  colorHex,
  size = 'md',
}: {
  type: ClothingType;
  colorHex: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'sm' ? 'w-16 h-16 text-2xl' : size === 'lg' ? 'w-40 h-40 text-6xl' : 'w-28 h-28 text-4xl';
  // light colors need a dark icon for contrast
  const isLight = isLightColor(colorHex);

  return (
    <div
      className={`${dims} rounded-2xl flex items-center justify-center shrink-0 shadow-inner ring-1 ring-black/10`}
      style={{ backgroundColor: colorHex }}
    >
      <span className={isLight ? 'opacity-80' : 'opacity-90 drop-shadow'} style={{ filter: isLight ? 'none' : 'brightness(3) saturate(0)' }}>
        {ICONS[type] ?? '👕'}
      </span>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
