import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Doc, Layer, Rect, Tool } from '../types';
import { renderScene, type RenderDeps } from '../lib/render';

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLES: { id: HandleId; x: number; y: number; cursor: string }[] = [
  { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'n', x: 0.5, y: 0, cursor: 'ns-resize' },
  { id: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
  { id: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
  { id: 's', x: 0.5, y: 1, cursor: 'ns-resize' },
  { id: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'w', x: 0, y: 0.5, cursor: 'ew-resize' },
];

interface DragState {
  kind: 'move' | 'resize' | 'draw';
  handle?: HandleId;
  layerId?: string;
  startX: number;
  startY: number;
  origin: Rect;
  shift: boolean;
}

export interface CanvasStageProps {
  doc: Doc;
  deps: RenderDeps;
  /** Bumped whenever cover patches finish recomputing, to force a repaint. */
  renderKey: number;
  tool: Tool;
  zoom: number | 'fit';
  selectedId: string | null;
  detections: Rect[];
  onScaleChange: (scale: number) => void;
  onSelect: (id: string | null) => void;
  onDrawRect: (rect: Rect) => void;
  onLayerChange: (id: string, patch: Partial<Layer>, transient: boolean) => void;
  onCheckpoint: () => void;
  onAcceptDetection: (rect: Rect) => void;
  onDismissDetection: (rect: Rect) => void;
  onEditText: (id: string) => void;
}

function rotatePoint(x: number, y: number, cx: number, cy: number, degrees: number): [number, number] {
  if (!degrees) return [x, y];
  const radians = (-degrees * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * Math.cos(radians) - dy * Math.sin(radians), cy + dx * Math.sin(radians) + dy * Math.cos(radians)];
}

function hitTest(doc: Doc, x: number, y: number): Layer | null {
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const layer = doc.layers[i];
    if (!layer.visible || layer.locked) continue;
    const [lx, ly] = rotatePoint(x, y, layer.x + layer.width / 2, layer.y + layer.height / 2, layer.rotation);
    if (lx >= layer.x && lx <= layer.x + layer.width && ly >= layer.y && ly <= layer.y + layer.height) {
      return layer;
    }
  }
  return null;
}

function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

function resizeRect(origin: Rect, handle: HandleId, dx: number, dy: number, keepRatio: boolean): Rect {
  let { x, y, width, height } = origin;

  if (handle.includes('w')) {
    x = origin.x + dx;
    width = origin.width - dx;
  }
  if (handle.includes('e')) {
    width = origin.width + dx;
  }
  if (handle.includes('n')) {
    y = origin.y + dy;
    height = origin.height - dy;
  }
  if (handle.includes('s')) {
    height = origin.height + dy;
  }

  if (keepRatio && origin.width > 0 && origin.height > 0 && handle.length === 2) {
    const ratio = origin.width / origin.height;
    if (Math.abs(width / ratio) > Math.abs(height)) height = width / ratio;
    else width = height * ratio;
    if (handle.includes('n')) y = origin.y + origin.height - height;
    if (handle.includes('w')) x = origin.x + origin.width - width;
  }

  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }

  return { x, y, width: Math.max(4, width), height: Math.max(4, height) };
}

export default function CanvasStage(props: CanvasStageProps) {
  const {
    doc,
    deps,
    renderKey,
    tool,
    zoom,
    selectedId,
    detections,
    onScaleChange,
    onSelect,
    onDrawRect,
    onLayerChange,
    onCheckpoint,
    onAcceptDetection,
    onDismissDetection,
    onEditText,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [marquee, setMarquee] = useState<Rect | null>(null);

  const scale = zoom === 'fit' ? fitScale : zoom;

  // Keep the fit scale in sync with the viewport.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const padding = 56;
      const availableWidth = Math.max(80, container.clientWidth - padding);
      const availableHeight = Math.max(80, container.clientHeight - padding);
      const next = Math.min(availableWidth / doc.width, availableHeight / doc.height, 1.5);
      setFitScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [doc.width, doc.height]);

  useEffect(() => {
    onScaleChange(scale);
  }, [scale, onScaleChange]);

  // Repaint whenever anything visible changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = doc.width * scale;
    const cssHeight = doc.height * scale;

    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderScene(ctx, doc, deps, scale);
  }, [doc, deps, scale, renderKey]);

  const toDocSpace = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const bounds = canvas.getBoundingClientRect();
      return { x: (clientX - bounds.left) / scale, y: (clientY - bounds.top) / scale };
    },
    [scale],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      const point = toDocSpace(event.clientX, event.clientY);
      const target = event.target as HTMLElement;
      const handle = target.dataset.handle as HandleId | undefined;
      const layerId = target.dataset.layer;

      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

      if (handle && selectedId) {
        const layer = doc.layers.find((l) => l.id === selectedId);
        if (!layer) return;
        onCheckpoint();
        dragRef.current = {
          kind: 'resize',
          handle,
          layerId: selectedId,
          startX: point.x,
          startY: point.y,
          origin: { x: layer.x, y: layer.y, width: layer.width, height: layer.height },
          shift: event.shiftKey,
        };
        return;
      }

      if (tool !== 'select') {
        dragRef.current = {
          kind: 'draw',
          startX: point.x,
          startY: point.y,
          origin: { x: point.x, y: point.y, width: 0, height: 0 },
          shift: event.shiftKey,
        };
        setMarquee({ x: point.x, y: point.y, width: 0, height: 0 });
        return;
      }

      const layer = layerId
        ? doc.layers.find((l) => l.id === layerId)
        : hitTest(doc, point.x, point.y);

      if (!layer) {
        onSelect(null);
        return;
      }

      onSelect(layer.id);
      if (layer.locked) return;
      onCheckpoint();
      dragRef.current = {
        kind: 'move',
        layerId: layer.id,
        startX: point.x,
        startY: point.y,
        origin: { x: layer.x, y: layer.y, width: layer.width, height: layer.height },
        shift: event.shiftKey,
      };
    },
    [doc, onCheckpoint, onSelect, selectedId, toDocSpace, tool],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const point = toDocSpace(event.clientX, event.clientY);
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;

      if (drag.kind === 'draw') {
        setMarquee(normalizeRect({ x: drag.startX, y: drag.startY }, point));
        return;
      }
      if (!drag.layerId) return;

      if (drag.kind === 'move') {
        const shiftLock = event.shiftKey;
        const moveX = shiftLock && Math.abs(dx) < Math.abs(dy) ? 0 : dx;
        const moveY = shiftLock && Math.abs(dy) <= Math.abs(dx) ? 0 : dy;
        onLayerChange(
          drag.layerId,
          { x: Math.round(drag.origin.x + moveX), y: Math.round(drag.origin.y + moveY) },
          true,
        );
        return;
      }

      if (drag.kind === 'resize' && drag.handle) {
        const next = resizeRect(drag.origin, drag.handle, dx, dy, event.shiftKey);
        onLayerChange(
          drag.layerId,
          {
            x: Math.round(next.x),
            y: Math.round(next.y),
            width: Math.round(next.width),
            height: Math.round(next.height),
          },
          true,
        );
      }
    },
    [onLayerChange, toDocSpace],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      try {
        (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
      } catch {
        /* pointer already released */
      }
      if (!drag) return;

      if (drag.kind === 'draw') {
        const point = toDocSpace(event.clientX, event.clientY);
        const rect = normalizeRect({ x: drag.startX, y: drag.startY }, point);
        setMarquee(null);
        if (rect.width > 6 && rect.height > 6) {
          onDrawRect({
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
    },
    [onDrawRect, toDocSpace],
  );

  const cursor = tool === 'select' ? 'default' : 'crosshair';

  return (
    <div
      ref={containerRef}
      className="checker relative flex h-full w-full items-center justify-center overflow-auto scroll-thin"
    >
      <div className="relative m-7 shrink-0" style={{ width: doc.width * scale, height: doc.height * scale }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block rounded-[2px] shadow-[0_24px_70px_-20px_rgba(0,0,0,0.75)]"
        />

        <div
          className="absolute inset-0 no-select"
          style={{ cursor }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Detected text candidates awaiting confirmation */}
          {detections.map((rect, index) => (
            <div
              key={`${rect.x}-${rect.y}-${index}`}
              className="group absolute border-2 border-dashed border-[#D9FF00]/80 bg-[#D9FF00]/10"
              style={{
                left: rect.x * scale,
                top: rect.y * scale,
                width: rect.width * scale,
                height: rect.height * scale,
              }}
            >
              <div className="absolute -top-8 left-0 z-10 hidden gap-1 whitespace-nowrap group-hover:flex">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onAcceptDetection(rect)}
                  className="rounded-md bg-[#D9FF00] px-2 py-1 text-[10px] font-bold text-[#0C0E14] hover:bg-[#E4FF4D]"
                >
                  替换此处
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onDismissDetection(rect)}
                  className="rounded-md bg-[#242A36] px-2 py-1 text-[10px] font-semibold text-[#B9C0CD] hover:bg-[#2F3646]"
                >
                  忽略
                </button>
              </div>
            </div>
          ))}

          {/* Layer boxes */}
          {doc.layers.map((layer) => {
            if (!layer.visible) return null;
            const isSelected = layer.id === selectedId;
            return (
              <div
                key={layer.id}
                data-layer={layer.id}
                onDoubleClick={() => layer.kind === 'text' && onEditText(layer.id)}
                className={`absolute ${
                  isSelected
                    ? 'outline outline-2 outline-[#D9FF00]'
                    : 'outline outline-1 outline-transparent hover:outline-[#D9FF00]/40'
                } ${layer.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
                style={{
                  left: layer.x * scale,
                  top: layer.y * scale,
                  width: layer.width * scale,
                  height: layer.height * scale,
                  transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                }}
              >
                {isSelected && !layer.locked
                  ? HANDLES.map((handle) => (
                      <span
                        key={handle.id}
                        data-handle={handle.id}
                        className="absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-[#0C0E14] bg-[#D9FF00]"
                        style={{
                          left: `${handle.x * 100}%`,
                          top: `${handle.y * 100}%`,
                          cursor: handle.cursor,
                        }}
                      />
                    ))
                  : null}
              </div>
            );
          })}

          {/* Rectangle being drawn */}
          {marquee ? (
            <div
              className="pointer-events-none absolute border-2 border-[#D9FF00] bg-[#D9FF00]/15"
              style={{
                left: marquee.x * scale,
                top: marquee.y * scale,
                width: marquee.width * scale,
                height: marquee.height * scale,
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
