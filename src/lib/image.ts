import type { FitMode, Rect } from '../types';
import { putAsset } from './assets';

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败'));
    image.src = src;
  });
}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export interface LoadedAsset {
  id: string;
  width: number;
  height: number;
  name: string;
}

export async function fileToAsset(file: Blob, name = 'image'): Promise<LoadedAsset> {
  const src = await readAsDataURL(file);
  const image = await loadImage(src);
  return {
    id: putAsset(image, src),
    width: image.naturalWidth,
    height: image.naturalHeight,
    name,
  };
}

export async function dataUrlToAsset(src: string, name = 'image'): Promise<LoadedAsset> {
  const image = await loadImage(src);
  return {
    id: putAsset(image, src),
    width: image.naturalWidth,
    height: image.naturalHeight,
    name,
  };
}

/** Placement of an image of `iw`×`ih` inside a `cw`×`ch` box. */
export function fitRect(fit: FitMode, cw: number, ch: number, iw: number, ih: number): Rect {
  if (fit === 'fill' || iw <= 0 || ih <= 0) {
    return { x: 0, y: 0, width: cw, height: ch };
  }
  const boxRatio = cw / ch;
  const imgRatio = iw / ih;
  const matchWidth = fit === 'cover' ? imgRatio < boxRatio : imgRatio > boxRatio;
  const width = matchWidth ? cw : ch * imgRatio;
  const height = matchWidth ? cw / imgRatio : ch;
  return { x: (cw - width) / 2, y: (ch - height) / 2, width, height };
}

export function clampRectToCanvas(rect: Rect, width: number, height: number): Rect {
  const x = Math.max(0, Math.min(rect.x, width - 1));
  const y = Math.max(0, Math.min(rect.y, height - 1));
  return {
    x,
    y,
    width: Math.max(1, Math.min(rect.width, width - x)),
    height: Math.max(1, Math.min(rect.height, height - y)),
  };
}

/** Downscales pixels for analysis passes that do not need full resolution. */
export function downscalePixels(
  image: HTMLImageElement,
  targetWidth: number,
): { data: ImageData; scale: number } | null {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  const scale = naturalWidth > targetWidth ? targetWidth / naturalWidth : 1;
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  try {
    return { data: ctx.getImageData(0, 0, width, height), scale };
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
