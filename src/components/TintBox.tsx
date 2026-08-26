import type { RectPct } from '../hooks/useDraggableRect';

function getLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export default function TintBox({
  rect,
  color,
  onMovePointerDown,
  onResizePointerDown,
}: {
  rect: RectPct;
  color: string;
  onMovePointerDown: (e: React.PointerEvent) => void;
  onResizePointerDown: (e: React.PointerEvent) => void;
}) {
  const luminance = getLuminance(color);
  // mix-blend "color" recolors hue/saturation while keeping the photo's shading,
  // but it can't push luminance past what's already in the photo — these extra
  // layers nudge very dark (e.g. black) or very light (e.g. white) targets further.
  const darkenOpacity = luminance < 0.35 ? Math.min(0.5, (0.35 - luminance) * 1.3) : 0;
  const lightenOpacity = luminance > 0.75 ? Math.min(0.45, (luminance - 0.75) * 1.6) : 0;

  return (
    <div
      onPointerDown={onMovePointerDown}
      className="absolute rounded-xl overflow-hidden cursor-move ring-1 ring-white/40"
      style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
    >
      <div className="absolute inset-0 mix-blend-color" style={{ backgroundColor: color }} />
      {darkenOpacity > 0 && (
        <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: '#000', opacity: darkenOpacity }} />
      )}
      {lightenOpacity > 0 && (
        <div className="absolute inset-0 mix-blend-screen" style={{ backgroundColor: '#fff', opacity: lightenOpacity }} />
      )}
      <div
        onPointerDown={onResizePointerDown}
        className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full bg-white ring-2 ring-indigo-600 cursor-nwse-resize"
      />
    </div>
  );
}
