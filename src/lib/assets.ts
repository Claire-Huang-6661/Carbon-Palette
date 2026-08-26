import type { AssetId } from '../types';

/**
 * Bitmaps live outside React state: they are large, never diffed, and must not
 * end up inside undo/redo snapshots. Layers reference them by id instead.
 */
const images = new Map<AssetId, HTMLImageElement>();
const sources = new Map<AssetId, string>();
const pixelCache = new Map<AssetId, ImageData>();

let counter = 0;

export function putAsset(image: HTMLImageElement, src: string): AssetId {
  const id = `asset-${++counter}`;
  images.set(id, image);
  sources.set(id, src);
  return id;
}

export function getAsset(id: AssetId | null | undefined): HTMLImageElement | undefined {
  return id ? images.get(id) : undefined;
}

export function getAssetSrc(id: AssetId | null | undefined): string | undefined {
  return id ? sources.get(id) : undefined;
}

/** Full-resolution pixels of an asset, computed once and memoised. */
export function getAssetPixels(id: AssetId | null | undefined): ImageData | undefined {
  if (!id) return undefined;
  const cached = pixelCache.get(id);
  if (cached) return cached;

  const image = images.get(id);
  if (!image) return undefined;

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return undefined;
  ctx.drawImage(image, 0, 0);

  try {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    pixelCache.set(id, data);
    return data;
  } catch {
    // Tainted canvas (cross-origin source without CORS headers).
    return undefined;
  }
}
