import type { Doc, ImageLayer, Layer, Rect, TextLayer } from '../types';
import { getAsset } from './assets';
import { withAlpha } from './color';
import { fitRect } from './image';
import { applyLetterSpacing, fontShorthand, layoutText, resetLetterSpacing } from './textLayout';

export interface RenderDeps {
  /** Cover bitmap for a layer, already sized in source pixels. */
  getPatch(layerId: string): HTMLCanvasElement | null | undefined;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function filterString(blur: number, brightness: number, saturate: number): string {
  const parts: string[] = [];
  if (blur > 0) parts.push(`blur(${blur}px)`);
  if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
  if (saturate !== 100) parts.push(`saturate(${saturate}%)`);
  return parts.length ? parts.join(' ') : 'none';
}

/** The rect of original pixels a layer's cover erases. */
export function coverRect(layer: Layer): Rect {
  const pad = layer.cover.padding;
  return {
    x: layer.x - pad,
    y: layer.y - pad,
    width: layer.width + pad * 2,
    height: layer.height + pad * 2,
  };
}

/**
 * Covers reconstruct the *original* photo's background, so they are only
 * meaningful while that photo is still the backdrop. Swap the background and
 * they would paint stale pixels over the new one.
 */
export function coversApply(doc: Doc): boolean {
  return doc.background.kind === 'original';
}

function drawBackground(ctx: CanvasRenderingContext2D, doc: Doc, scale: number): void {
  const width = doc.width * scale;
  const height = doc.height * scale;
  const background = doc.background;

  if (background.kind === 'solid') {
    ctx.fillStyle = background.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (background.kind === 'gradient') {
    const radians = (background.angle * Math.PI) / 180;
    const half = Math.max(width, height);
    const cx = width / 2;
    const cy = height / 2;
    const gradient = ctx.createLinearGradient(
      cx - (Math.cos(radians) * half) / 2,
      cy - (Math.sin(radians) * half) / 2,
      cx + (Math.cos(radians) * half) / 2,
      cy + (Math.sin(radians) * half) / 2,
    );
    gradient.addColorStop(0, background.from);
    gradient.addColorStop(1, background.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const assetId = background.kind === 'image' ? background.assetId : doc.sourceAssetId;
  const image = getAsset(assetId);
  if (!image) return;

  if (background.kind === 'original') {
    ctx.drawImage(image, 0, 0, width, height);
    return;
  }

  const base = fitRect(background.fit, width, height, image.naturalWidth, image.naturalHeight);
  const zoom = background.scale;
  const drawWidth = base.width * zoom;
  const drawHeight = base.height * zoom;
  const x = base.x - (drawWidth - base.width) / 2 + background.offsetX * width;
  const y = base.y - (drawHeight - base.height) / 2 + background.offsetY * height;

  const blur = background.blur * scale;
  ctx.save();
  ctx.filter = filterString(blur, background.brightness, background.saturate);

  if (blur > 0) {
    // Overdraw so the blur's soft edge lands outside the canvas.
    const bleed = blur * 3;
    ctx.drawImage(
      image,
      x - bleed,
      y - bleed,
      drawWidth + bleed * 2,
      drawHeight + bleed * 2,
    );
  } else {
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
  }
  ctx.restore();
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer, scale: number): void {
  const layout = layoutText(layer);
  if (layout.lines.length === 0) return;

  const boxWidth = layer.width * scale;
  const boxHeight = layer.height * scale;
  const padX = layer.pill.enabled ? layer.pill.paddingX * scale : 0;
  const padY = layer.pill.enabled ? layer.pill.paddingY * scale : 0;
  const fontSize = layout.fontSize * scale;
  const lineHeight = layout.lineHeightPx * scale;
  const blockHeight = layout.blockHeight * scale;

  let top = padY;
  if (layer.vAlign === 'middle') top = (boxHeight - blockHeight) / 2;
  else if (layer.vAlign === 'bottom') top = boxHeight - blockHeight - padY;

  if (layer.pill.enabled) {
    ctx.fillStyle = layer.pill.color;
    if (layer.pill.fit === 'box') {
      roundedRectPath(ctx, 0, 0, boxWidth, boxHeight, layer.pill.radius * scale);
    } else {
      const pillWidth = Math.min(boxWidth, layout.maxLineWidth * scale + padX * 2);
      let pillX = 0;
      if (layer.align === 'center') pillX = (boxWidth - pillWidth) / 2;
      else if (layer.align === 'right') pillX = boxWidth - pillWidth;
      roundedRectPath(
        ctx,
        pillX,
        top - padY,
        pillWidth,
        blockHeight + padY * 2,
        layer.pill.radius * scale,
      );
    }
    ctx.fill();
  }

  ctx.font = fontShorthand(layer, fontSize);
  applyLetterSpacing(ctx, layer.letterSpacing * scale);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  if (layer.shadow.enabled) {
    ctx.shadowColor = layer.shadow.color;
    ctx.shadowBlur = layer.shadow.blur * scale;
    ctx.shadowOffsetX = layer.shadow.x * scale;
    ctx.shadowOffsetY = layer.shadow.y * scale;
  }

  layout.lines.forEach((line, index) => {
    if (!line) return;
    const width = ctx.measureText(line).width;
    let x = padX;
    if (layer.align === 'center') x = (boxWidth - width) / 2;
    else if (layer.align === 'right') x = boxWidth - width - padX;

    // Centre each line inside its leading, then sit on the alphabetic baseline.
    const y = top + index * lineHeight + (lineHeight - fontSize) / 2 + fontSize * 0.8;

    if (layer.strokeWidth > 0) {
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeStyle = layer.strokeColor;
      ctx.lineWidth = layer.strokeWidth * scale * 2;
      ctx.strokeText(line, x, y);
    }

    ctx.fillStyle = layer.color;
    ctx.fillText(line, x, y);
  });

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  resetLetterSpacing(ctx);
}

function drawImageLayer(ctx: CanvasRenderingContext2D, layer: ImageLayer, scale: number): void {
  const image = getAsset(layer.assetId);
  if (!image) return;

  const boxWidth = layer.width * scale;
  const boxHeight = layer.height * scale;

  ctx.save();
  if (layer.radius > 0) {
    roundedRectPath(ctx, 0, 0, boxWidth, boxHeight, layer.radius * scale);
    ctx.clip();
  } else {
    ctx.beginPath();
    ctx.rect(0, 0, boxWidth, boxHeight);
    ctx.clip();
  }

  const rect = fitRect(layer.fit, boxWidth, boxHeight, image.naturalWidth, image.naturalHeight);
  ctx.filter = filterString(layer.filters.blur * scale, layer.filters.brightness, layer.filters.saturate);
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  ctx.filter = 'none';
  ctx.restore();
}

/**
 * Draws the whole composition. `scale` of 1 renders at the source image's own
 * resolution — which is what export uses; the preview passes a smaller value.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  doc: Doc,
  deps: RenderDeps,
  scale = 1,
): void {
  const width = doc.width * scale;
  const height = doc.height * scale;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  drawBackground(ctx, doc, scale);

  if (doc.overlay.enabled && doc.overlay.opacity > 0) {
    ctx.fillStyle = withAlpha(doc.overlay.color, doc.overlay.opacity);
    ctx.fillRect(0, 0, width, height);
  }

  const applyCovers = coversApply(doc);

  for (const layer of doc.layers) {
    if (!layer.visible) continue;

    if (applyCovers && layer.cover.enabled && layer.cover.mode !== 'none') {
      const patch = deps.getPatch(layer.id);
      if (patch) {
        const rect = coverRect(layer);
        ctx.drawImage(patch, rect.x * scale, rect.y * scale, rect.width * scale, rect.height * scale);
      }
    }

    ctx.save();
    ctx.globalAlpha = layer.opacity;

    const centerX = (layer.x + layer.width / 2) * scale;
    const centerY = (layer.y + layer.height / 2) * scale;
    ctx.translate(centerX, centerY);
    if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-(layer.width * scale) / 2, -(layer.height * scale) / 2);

    if (layer.kind === 'text') drawTextLayer(ctx, layer, scale);
    else drawImageLayer(ctx, layer, scale);

    ctx.restore();
  }

  ctx.restore();
}

export function renderToCanvas(doc: Doc, deps: RenderDeps, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(doc.width * scale));
  canvas.height = Math.max(1, Math.round(doc.height * scale));
  const ctx = canvas.getContext('2d');
  if (ctx) renderScene(ctx, doc, deps, scale);
  return canvas;
}
