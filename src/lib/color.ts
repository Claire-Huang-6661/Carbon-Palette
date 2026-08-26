import type { Rect } from '../types';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  let value = hex.replace('#', '').trim();
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('');
  }
  const int = Number.parseInt(value.slice(0, 6) || '000000', 16);
  if (Number.isNaN(int)) return { r: 0, g: 0, b: 0 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Black or white, whichever reads better on the given background. */
export function readableInk(hex: string): string {
  return relativeLuminance(hexToRgb(hex)) > 0.45 ? '#111318' : '#FFFFFF';
}

function distanceSq(a: RGB, b: RGB): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

function clampRect(pixels: ImageData, rect: Rect) {
  return {
    x0: Math.max(0, Math.floor(rect.x)),
    y0: Math.max(0, Math.floor(rect.y)),
    x1: Math.min(pixels.width, Math.ceil(rect.x + rect.width)),
    y1: Math.min(pixels.height, Math.ceil(rect.y + rect.height)),
  };
}

function pixelAt(pixels: ImageData, x: number, y: number): RGB {
  const i = (y * pixels.width + x) * 4;
  return { r: pixels.data[i], g: pixels.data[i + 1], b: pixels.data[i + 2] };
}

function medianOf(samples: RGB[]): RGB {
  const pick = (key: keyof RGB) => {
    const values = samples.map((s) => s[key]).sort((a, b) => a - b);
    return values[values.length >> 1];
  };
  return { r: pick('r'), g: pick('g'), b: pick('b') };
}

interface Bin {
  count: number;
  color: RGB;
}

/** Quantised colour census of a region, most populous first. */
function histogram(pixels: ImageData, rect: Rect): { bins: Bin[]; total: number } {
  const { x0, y0, x1, y1 } = clampRect(pixels, rect);
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  const data = pixels.data;
  let total = 0;

  const stepX = Math.max(1, Math.floor((x1 - x0) / 200));
  const stepY = Math.max(1, Math.floor((y1 - y0) / 200));

  for (let y = y0; y < y1; y += stepY) {
    for (let x = x0; x < x1; x += stepX) {
      const i = (y * pixels.width + x) * 4;
      if (data[i + 3] < 16) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count++;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
      } else {
        buckets.set(key, { count: 1, r, g, b });
      }
      total++;
    }
  }

  const bins = [...buckets.values()]
    .map((bucket) => ({
      count: bucket.count,
      color: {
        r: bucket.r / bucket.count,
        g: bucket.g / bucket.count,
        b: bucket.b / bucket.count,
      },
    }))
    .sort((a, b) => b.count - a.count);

  return { bins, total };
}

export interface PlateInfo {
  color: string;
  /** Corner radius in source pixels, inferred from the plate's area. */
  radius: number;
  /** Tight bounds of the plate inside the analysed region. */
  rect: Rect;
}

/**
 * Banner copy often sits on its own coloured shape — a pill badge, a CTA
 * button. Erasing the region would throw that shape away along with the text,
 * so we measure it here and rebuild it as the layer's backing plate.
 *
 * The candidate is the most common colour in the region that is clearly not
 * the surroundings. What separates a plate from the text itself is solidity:
 * a button fills nearly all of its own bounding box, whereas glyphs cover only
 * a fraction of theirs. The corner radius then follows from the shape's area,
 * since a rounded rectangle loses `(4 - π)r²` against its bounding box —
 * measured per row as the span between its first and last plate pixel, so the
 * glyphs punched out of the middle do not skew it.
 */
function detectPlate(pixels: ImageData, rect: Rect, surround: RGB): PlateInfo | null {
  const { bins } = histogram(pixels, rect);
  const candidate = bins.find((bin) => distanceSq(bin.color, surround) > 32 * 32);
  if (!candidate) return null;

  const plateColor = candidate.color;
  const { x0, y0, x1, y1 } = clampRect(pixels, rect);
  const regionArea = (x1 - x0) * (y1 - y0);

  let solid = 0;
  let filled = 0;
  let minX = x1;
  let maxX = x0 - 1;
  let minY = y1;
  let maxY = y0 - 1;

  for (let y = y0; y < y1; y++) {
    let first = -1;
    let last = -1;
    for (let x = x0; x < x1; x++) {
      const color = pixelAt(pixels, x, y);
      const toPlate = distanceSq(color, plateColor);
      // Belonging to the plate means being nearer to it than to what surrounds
      // the region, and not merely "not the background".
      if (toPlate < distanceSq(color, surround) && toPlate < 110 * 110) {
        if (first === -1) first = x;
        last = x;
        solid++;
      }
    }
    if (first === -1) continue;
    filled += last - first + 1;
    if (first < minX) minX = first;
    if (last > maxX) maxX = last;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (maxX < minX || maxY < minY) return null;

  const plateWidth = maxX - minX + 1;
  const plateHeight = maxY - minY + 1;
  const plateArea = plateWidth * plateHeight;

  // Too small to be the backing of this region, or too sparse to be a shape at
  // all — the latter is what rules out mistaking the lettering for a plate.
  if (plateArea < regionArea * 0.25) return null;
  if (solid / plateArea < 0.6) return null;

  const ratio = filled / plateArea;
  const radius = Math.sqrt((Math.max(0, 1 - ratio) * plateArea) / (4 - Math.PI));

  return {
    color: rgbToHex(plateColor),
    radius: Math.min(radius, Math.min(plateWidth, plateHeight) / 2),
    rect: { x: minX, y: minY, width: plateWidth, height: plateHeight },
  };
}

export interface RegionAnalysis {
  /** Colour of the text itself. */
  ink: string;
  /** Colour immediately outside the region — what the erase will blend into. */
  surround: string;
  plate: PlateInfo | null;
}

/**
 * Works out how a region of the source is coloured so a replacement layer can
 * be pre-filled to match it.
 *
 * The ink is found by contrast against whatever backs it, and *that* has to
 * come from the surroundings rather than from a colour census of the region:
 * a gradient backdrop scatters across dozens of quantised bins while solid
 * glyphs pile into one, so the most populous bin inside a region of white text
 * on a gradient is the white text.
 */
export function analyzeRegion(pixels: ImageData, rect: Rect): RegionAnalysis {
  const { x0, y0, x1, y1 } = clampRect(pixels, rect);
  if (x1 - x0 < 1 || y1 - y0 < 1) {
    return { ink: '#111318', surround: '#FFFFFF', plate: null };
  }

  const surroundHex = ringColor(pixels, rect);
  const surround = hexToRgb(surroundHex);
  const plate = detectPlate(pixels, rect, surround);
  const backdrop = plate ? hexToRgb(plate.color) : surround;

  // Measure the ink inside the plate when there is one, so background outside
  // the button cannot win the contrast contest against the button's own fill.
  const { bins, total } = histogram(pixels, plate ? plate.rect : rect);

  if (total === 0) {
    return { ink: readableInk(surroundHex), surround: surroundHex, plate };
  }

  const minCount = Math.max(1, total * 0.015);
  let ink = backdrop;
  let best = -1;

  for (const bin of bins) {
    if (bin.count < minCount) continue;
    const score = distanceSq(bin.color, backdrop) * Math.log(1 + bin.count);
    if (score > best) {
      best = score;
      ink = bin.color;
    }
  }

  // Nothing stood out from the backdrop: pick something legible instead of
  // handing back a colour that would render invisible.
  if (distanceSq(ink, backdrop) < 1600) {
    return { ink: readableInk(rgbToHex(backdrop)), surround: surroundHex, plate };
  }

  return { ink: rgbToHex(ink), surround: surroundHex, plate };
}

/** Median colour of the ring of pixels just outside a region. */
export function ringColor(pixels: ImageData, rect: Rect, thickness = 3): string {
  const samples: RGB[] = [];
  const x0 = Math.floor(rect.x);
  const y0 = Math.floor(rect.y);
  const x1 = Math.ceil(rect.x + rect.width);
  const y1 = Math.ceil(rect.y + rect.height);

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) return;
    const i = (y * pixels.width + x) * 4;
    samples.push({ r: pixels.data[i], g: pixels.data[i + 1], b: pixels.data[i + 2] });
  };

  for (let x = x0; x < x1; x++) {
    for (let t = 1; t <= thickness; t++) {
      push(x, y0 - t);
      push(x, y1 + t - 1);
    }
  }
  for (let y = y0; y < y1; y++) {
    for (let t = 1; t <= thickness; t++) {
      push(x0 - t, y);
      push(x1 + t - 1, y);
    }
  }

  if (samples.length === 0) return '#FFFFFF';
  return rgbToHex(medianOf(samples));
}
