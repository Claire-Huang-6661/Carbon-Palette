export type ExportFormat = 'png' | 'jpeg' | 'webp';

export const MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), MIME[format], quality);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await canvasToBlob(canvas, 'png', 1);
    if (!blob || !navigator.clipboard || !('write' in navigator.clipboard)) return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}
