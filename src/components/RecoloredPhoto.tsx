function getLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Recolors a borrowed reference photo toward a target colour using CSS
// mix-blend-mode (same technique as TintBox's live-preview overlay) — keeps the
// photo's real shading/folds/texture, just shifts hue/saturation, so it still
// reads as an actual garment instead of a flat icon.
export default function RecoloredPhoto({
  src,
  alt,
  color,
  className,
  fit = 'cover',
  maxHeightPx = 192,
}: {
  src: string;
  alt: string;
  color: string;
  className?: string;
  // 'cover' for small square chip thumbnails (cropping is fine); 'contain' for
  // a larger "actual look" preview where the whole garment must stay visible.
  fit?: 'cover' | 'contain';
  // Only used by fit="contain". Must be a concrete pixel value, not a Tailwind
  // percentage class (max-h-full) — the wrapper below is inline-block with no
  // explicit height, so percentage heights have no containing block to resolve
  // against and silently no-op, letting the image overflow uncapped.
  maxHeightPx?: number;
}) {
  const luminance = getLuminance(color);
  const darkenOpacity = luminance < 0.35 ? Math.min(0.5, (0.35 - luminance) * 1.3) : 0;
  const lightenOpacity = luminance > 0.75 ? Math.min(0.45, (luminance - 0.75) * 1.6) : 0;
  const overlays = (
    <>
      <div className="absolute inset-0 mix-blend-color" style={{ backgroundColor: color }} />
      {darkenOpacity > 0 && (
        <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: '#000', opacity: darkenOpacity }} />
      )}
      {lightenOpacity > 0 && (
        <div className="absolute inset-0 mix-blend-screen" style={{ backgroundColor: '#fff', opacity: lightenOpacity }} />
      )}
    </>
  );

  if (fit === 'contain') {
    // The overlay rects are absolute-inset-0, which would tint the letterboxed
    // empty space around a contained image if sized to the full (cropped) box —
    // so size the relative wrapper to the rendered image itself (inline-block
    // shrink-wraps to content) instead of to the outer container.
    return (
      <div className={`relative inline-block max-w-full ${className ?? ''}`} style={{ maxHeight: maxHeightPx }}>
        <img src={src} alt={alt} className="block max-w-full object-contain" style={{ maxHeight: maxHeightPx }} />
        {overlays}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
      {overlays}
    </div>
  );
}
