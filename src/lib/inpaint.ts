import type { CoverMode, Rect } from '../types';

export interface PatchRequest {
  image: HTMLImageElement;
  pixels: ImageData;
  rect: Rect;
  mode: CoverMode;
  color: string;
  softness: number;
}

function integerRect(rect: Rect, width: number, height: number): Rect | null {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const right = Math.min(width, Math.ceil(rect.x + rect.width));
  const bottom = Math.min(height, Math.ceil(rect.y + rect.height));
  if (right - x < 1 || bottom - y < 1) return null;
  return { x, y, width: right - x, height: bottom - y };
}

/** Box-smooths an RGB strip in place so a single noisy pixel cannot streak. */
function smoothStrip(strip: Float32Array, length: number, radius: number): void {
  if (radius < 1 || length < 3) return;
  const out = new Float32Array(strip.length);
  for (let i = 0; i < length; i++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let k = -radius; k <= radius; k++) {
      const j = Math.max(0, Math.min(length - 1, i + k));
      r += strip[j * 3];
      g += strip[j * 3 + 1];
      b += strip[j * 3 + 2];
      n++;
    }
    out[i * 3] = r / n;
    out[i * 3 + 1] = g / n;
    out[i * 3 + 2] = b / n;
  }
  strip.set(out);
}

function sample(pixels: ImageData, x: number, y: number, out: Float32Array, offset: number): void {
  const cx = Math.max(0, Math.min(pixels.width - 1, x));
  const cy = Math.max(0, Math.min(pixels.height - 1, y));
  const i = (cy * pixels.width + cx) * 4;
  out[offset] = pixels.data[i];
  out[offset + 1] = pixels.data[i + 1];
  out[offset + 2] = pixels.data[i + 2];
}

/**
 * Reconstructs the region by interpolating inwards from the four boundaries,
 * weighted by inverse squared distance. Flat fills and linear/radial gradients
 * come back almost exactly; textured photos come back as a smooth blend, which
 * is why `blur` exists as an alternative.
 */
function interpolateFromBoundary(pixels: ImageData, rect: Rect): ImageData {
  const { x, y, width: w, height: h } = rect;
  const top = new Float32Array(w * 3);
  const bottom = new Float32Array(w * 3);
  const left = new Float32Array(h * 3);
  const right = new Float32Array(h * 3);

  for (let i = 0; i < w; i++) {
    sample(pixels, x + i, y - 1, top, i * 3);
    sample(pixels, x + i, y + h, bottom, i * 3);
  }
  for (let j = 0; j < h; j++) {
    sample(pixels, x - 1, y + j, left, j * 3);
    sample(pixels, x + w, y + j, right, j * 3);
  }

  smoothStrip(top, w, Math.min(6, Math.max(1, w >> 5)));
  smoothStrip(bottom, w, Math.min(6, Math.max(1, w >> 5)));
  smoothStrip(left, h, Math.min(6, Math.max(1, h >> 5)));
  smoothStrip(right, h, Math.min(6, Math.max(1, h >> 5)));

  const out = new ImageData(w, h);
  for (let j = 0; j < h; j++) {
    const dTop = j + 1;
    const dBottom = h - j;
    const wTop = 1 / (dTop * dTop);
    const wBottom = 1 / (dBottom * dBottom);

    for (let i = 0; i < w; i++) {
      const dLeft = i + 1;
      const dRight = w - i;
      const wLeft = 1 / (dLeft * dLeft);
      const wRight = 1 / (dRight * dRight);
      const sum = wTop + wBottom + wLeft + wRight;

      const o = (j * w + i) * 4;
      for (let c = 0; c < 3; c++) {
        out.data[o + c] =
          (top[i * 3 + c] * wTop +
            bottom[i * 3 + c] * wBottom +
            left[j * 3 + c] * wLeft +
            right[j * 3 + c] * wRight) /
          sum;
      }
      out.data[o + 3] = 255;
    }
  }
  return out;
}

/** Smears the surrounding pixels across the region using a large blur. */
function blurSurroundings(
  image: HTMLImageElement,
  rect: Rect,
  canvas: HTMLCanvasElement,
): void {
  const radius = Math.max(8, Math.round(Math.min(rect.width, rect.height) * 0.6));
  const margin = radius * 2;
  const sx = rect.x - margin;
  const sy = rect.y - margin;
  const sw = rect.width + margin * 2;
  const sh = rect.height + margin * 2;

  const scratch = document.createElement('canvas');
  scratch.width = Math.max(1, Math.round(sw));
  scratch.height = Math.max(1, Math.round(sh));
  const sctx = scratch.getContext('2d');
  if (!sctx) return;

  sctx.imageSmoothingEnabled = true;

  // Near an image border the requested source rect falls partly outside the
  // bitmap, where drawImage yields transparency and the blur would eat the
  // patch. Lay down a stretched copy of the clamped rect first so every pixel
  // of the scratch has colour, then draw the accurate crop over it.
  const cx = Math.max(0, Math.min(image.naturalWidth - 1, sx));
  const cy = Math.max(0, Math.min(image.naturalHeight - 1, sy));
  const cw = Math.max(1, Math.min(image.naturalWidth - cx, sw));
  const ch = Math.max(1, Math.min(image.naturalHeight - cy, sh));
  sctx.drawImage(image, cx, cy, cw, ch, 0, 0, scratch.width, scratch.height);
  sctx.drawImage(image, sx, sy, sw, sh, 0, 0, scratch.width, scratch.height);

  sctx.filter = `blur(${radius}px)`;
  sctx.drawImage(scratch, 0, 0);
  sctx.filter = 'none';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(
    scratch,
    margin,
    margin,
    rect.width,
    rect.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

/** Fades the outer `softness` pixels of the patch so its seam disappears. */
function feather(canvas: HTMLCanvasElement, softness: number): void {
  if (softness <= 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const inset = Math.min(softness, Math.floor(Math.min(canvas.width, canvas.height) / 2) - 1);
  if (inset <= 0) return;

  const mask = document.createElement('canvas');
  mask.width = canvas.width;
  mask.height = canvas.height;
  const mctx = mask.getContext('2d');
  if (!mctx) return;

  mctx.filter = `blur(${inset / 2}px)`;
  mctx.fillStyle = '#fff';
  mctx.fillRect(inset, inset, canvas.width - inset * 2, canvas.height - inset * 2);
  mctx.filter = 'none';

  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Builds the bitmap that hides whatever the layer sits on top of.
 * Returns `null` when nothing should be painted.
 */
export function buildPatch(request: PatchRequest): HTMLCanvasElement | null {
  const { image, pixels, mode, color, softness } = request;
  if (mode === 'none') return null;

  const rect = integerRect(request.rect, pixels.width, pixels.height);
  if (!rect) return null;

  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (mode === 'solid') {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (mode === 'blur') {
    blurSurroundings(image, rect, canvas);
  } else {
    ctx.putImageData(interpolateFromBoundary(pixels, rect), 0, 0);
  }

  feather(canvas, softness);
  return canvas;
}

export function patchKey(
  layerId: string,
  rect: Rect,
  mode: CoverMode,
  color: string,
  softness: number,
): string {
  const round = (n: number) => Math.round(n);
  return [
    layerId,
    mode,
    color,
    round(softness),
    round(rect.x),
    round(rect.y),
    round(rect.width),
    round(rect.height),
  ].join('|');
}
