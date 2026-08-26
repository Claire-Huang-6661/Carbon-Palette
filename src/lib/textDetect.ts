import type { Rect } from '../types';
import { downscalePixels } from './image';

/**
 * Heuristic text-region finder that runs entirely in the browser.
 *
 * Text on a banner is a dense cluster of short, high-contrast strokes sitting
 * on a comparatively calm background. The pipeline exploits exactly that:
 * gradient magnitude -> percentile threshold -> horizontal dilation (glue the
 * glyphs of one line together) -> connected components -> shape filtering.
 *
 * It is deliberately permissive: false positives are cheap because the user
 * picks which boxes to turn into editable layers.
 */

interface Component {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  count: number;
}

function toGrayscale(pixels: ImageData): Float32Array {
  const { width, height, data } = pixels;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }
  return gray;
}

function sobelMagnitude(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const tl = gray[i - width - 1];
      const t = gray[i - width];
      const tr = gray[i - width + 1];
      const l = gray[i - 1];
      const r = gray[i + 1];
      const bl = gray[i + width - 1];
      const b = gray[i + width];
      const br = gray[i + width + 1];
      const gx = tl + 2 * l + bl - tr - 2 * r - br;
      const gy = tl + 2 * t + tr - bl - 2 * b - br;
      out[i] = Math.min(255, Math.hypot(gx, gy) / 4);
    }
  }
  return out;
}

/** Value below which `ratio` of the magnitudes fall. */
function percentile(values: Float32Array, ratio: number): number {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < values.length; i++) {
    histogram[Math.min(255, values[i] | 0)]++;
  }
  const target = values.length * ratio;
  let seen = 0;
  for (let v = 0; v < 256; v++) {
    seen += histogram[v];
    if (seen >= target) return v;
  }
  return 255;
}

/** Separable binary dilation: a pixel survives if any neighbour in range is set. */
function dilate(
  mask: Uint8Array,
  width: number,
  height: number,
  radiusX: number,
  radiusY: number,
): Uint8Array {
  const horizontal = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let running = 0;
    for (let x = 0; x < Math.min(width, radiusX + 1); x++) running += mask[row + x];
    for (let x = 0; x < width; x++) {
      horizontal[row + x] = running > 0 ? 1 : 0;
      const drop = x - radiusX;
      const add = x + radiusX + 1;
      if (drop >= 0) running -= mask[row + drop];
      if (add < width) running += mask[row + add];
    }
  }

  if (radiusY <= 0) return horizontal;

  const out = new Uint8Array(mask.length);
  for (let x = 0; x < width; x++) {
    let running = 0;
    for (let y = 0; y < Math.min(height, radiusY + 1); y++) running += horizontal[y * width + x];
    for (let y = 0; y < height; y++) {
      out[y * width + x] = running > 0 ? 1 : 0;
      const drop = y - radiusY;
      const add = y + radiusY + 1;
      if (drop >= 0) running -= horizontal[drop * width + x];
      if (add < height) running += horizontal[add * width + x];
    }
  }
  return out;
}

function connectedComponents(mask: Uint8Array, width: number, height: number): Component[] {
  const seen = new Uint8Array(mask.length);
  const components: Component[] = [];
  const stack = new Int32Array(mask.length);

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] === 0 || seen[start] === 1) continue;

    let top = 0;
    stack[top++] = start;
    seen[start] = 1;

    const component: Component = {
      minX: width,
      minY: height,
      maxX: 0,
      maxY: 0,
      count: 0,
    };

    while (top > 0) {
      const index = stack[--top];
      const x = index % width;
      const y = (index - x) / width;

      component.count++;
      if (x < component.minX) component.minX = x;
      if (x > component.maxX) component.maxX = x;
      if (y < component.minY) component.minY = y;
      if (y > component.maxY) component.maxY = y;

      if (x > 0 && mask[index - 1] === 1 && seen[index - 1] === 0) {
        seen[index - 1] = 1;
        stack[top++] = index - 1;
      }
      if (x < width - 1 && mask[index + 1] === 1 && seen[index + 1] === 0) {
        seen[index + 1] = 1;
        stack[top++] = index + 1;
      }
      if (y > 0 && mask[index - width] === 1 && seen[index - width] === 0) {
        seen[index - width] = 1;
        stack[top++] = index - width;
      }
      if (y < height - 1 && mask[index + width] === 1 && seen[index + width] === 0) {
        seen[index + width] = 1;
        stack[top++] = index + width;
      }
    }

    components.push(component);
  }

  return components;
}

function overlaps(a: Rect, b: Rect): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const intersection = x * y;
  if (intersection === 0) return 0;
  return intersection / Math.min(a.width * a.height, b.width * b.height);
}

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

/** Merges boxes that overlap, or that sit on the same line with a small gap. */
function mergeBoxes(boxes: Rect[]): Rect[] {
  const result = [...boxes];
  let merged = true;

  while (merged) {
    merged = false;
    outer: for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];

        const sameLine =
          Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) <
            Math.min(a.height, b.height) * 0.45 &&
          Math.abs(a.height - b.height) < Math.max(a.height, b.height) * 0.5;
        const gap = Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
        const close = gap < Math.min(a.height, b.height) * 0.6;

        if (overlaps(a, b) > 0.3 || (sameLine && close)) {
          result[i] = union(a, b);
          result.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }

  return result;
}

export interface DetectOptions {
  /** 0 = permissive (more boxes), 1 = strict. */
  sensitivity?: number;
  maxResults?: number;
}

export function detectTextRegions(
  image: HTMLImageElement,
  options: DetectOptions = {},
): Rect[] {
  const sensitivity = Math.max(0, Math.min(1, options.sensitivity ?? 0.5));
  const maxResults = options.maxResults ?? 24;

  const downscaled = downscalePixels(image, 900);
  if (!downscaled) return [];

  const { data: pixels, scale } = downscaled;
  const { width, height } = pixels;
  if (width < 8 || height < 8) return [];

  const gray = toGrayscale(pixels);
  const magnitude = sobelMagnitude(gray, width, height);

  // Higher sensitivity keeps only the strongest edges.
  const ratio = 0.86 + sensitivity * 0.1;
  const threshold = Math.max(18, Math.min(110, percentile(magnitude, ratio)));

  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = magnitude[i] >= threshold ? 1 : 0;
  }

  const radiusX = Math.max(3, Math.round(width * 0.012));
  const radiusY = Math.max(1, Math.round(height * 0.006));
  const dilated = dilate(mask, width, height, radiusX, radiusY);

  const minHeight = Math.max(6, height * 0.015);
  const maxHeight = height * 0.6;

  const candidates: Rect[] = [];
  for (const component of connectedComponents(dilated, width, height)) {
    const boxWidth = component.maxX - component.minX + 1;
    const boxHeight = component.maxY - component.minY + 1;
    const area = boxWidth * boxHeight;

    if (boxHeight < minHeight || boxHeight > maxHeight) continue;
    if (boxWidth < 8 || area < 150) continue;
    if (boxWidth / boxHeight < 0.45) continue;
    if (boxWidth > width * 0.96 && boxHeight > height * 0.5) continue;
    if (component.count / area < 0.42) continue;

    // Stroke density measured on the *undilated* mask separates text from
    // large flat graphics whose outline alone triggered the edge detector.
    let strokes = 0;
    for (let y = component.minY; y <= component.maxY; y++) {
      for (let x = component.minX; x <= component.maxX; x++) {
        strokes += mask[y * width + x];
      }
    }
    const density = strokes / area;
    if (density < 0.06 || density > 0.72) continue;

    candidates.push({
      x: component.minX,
      y: component.minY,
      width: boxWidth,
      height: boxHeight,
    });
  }

  const merged = mergeBoxes(candidates)
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, maxResults);

  const padX = Math.max(2, radiusX * 0.35);
  const padY = Math.max(2, radiusY + 1);

  return merged
    .map((box) => {
      const x = Math.max(0, (box.x - padX) / scale);
      const y = Math.max(0, (box.y - padY) / scale);
      return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(Math.min(image.naturalWidth - x, (box.width + padX * 2) / scale)),
        height: Math.round(Math.min(image.naturalHeight - y, (box.height + padY * 2) / scale)),
      };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
}
