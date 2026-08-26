import { useRef, useState, type RefObject } from 'react';

export interface RectPct {
  x: number;
  y: number;
  w: number;
  h: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function useDraggableRect(initial: RectPct, containerRef: RefObject<HTMLElement | null>) {
  const [rect, setRect] = useState<RectPct>(initial);
  const dragRef = useRef<{
    mode: 'move' | 'resize';
    startClientX: number;
    startClientY: number;
    startRect: RectPct;
    containerW: number;
    containerH: number;
  } | null>(null);

  const onPointerMove = (e: PointerEvent) => {
    const ds = dragRef.current;
    if (!ds) return;
    const dxPct = ((e.clientX - ds.startClientX) / ds.containerW) * 100;
    const dyPct = ((e.clientY - ds.startClientY) / ds.containerH) * 100;

    if (ds.mode === 'move') {
      setRect({
        ...ds.startRect,
        x: clamp(ds.startRect.x + dxPct, 0, 100 - ds.startRect.w),
        y: clamp(ds.startRect.y + dyPct, 0, 100 - ds.startRect.h),
      });
    } else {
      setRect({
        ...ds.startRect,
        w: clamp(ds.startRect.w + dxPct, 12, 100 - ds.startRect.x),
        h: clamp(ds.startRect.h + dyPct, 12, 100 - ds.startRect.y),
      });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  const startDrag = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    dragRef.current = {
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: rect,
      containerW: containerRect.width,
      containerH: containerRect.height,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const reset = () => setRect(initial);

  return {
    rect,
    onMoveHandlePointerDown: startDrag('move'),
    onResizeHandlePointerDown: startDrag('resize'),
    reset,
  };
}
