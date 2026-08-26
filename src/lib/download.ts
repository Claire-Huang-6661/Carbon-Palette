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

interface HostDownloads {
  save(request: { filename: string; data: Blob }): Promise<{ status: 'saved' }>;
}

/**
 * Some embedders (the claude.ai artifact viewer among them) sandbox the frame
 * so a download the page starts itself never reaches the viewer, and instead
 * expose a host-mediated save. Resolve it once at load — outside such a host
 * `window.claude` is absent and this settles to null immediately, so the
 * export click never waits on it.
 */
const hostDownloads: Promise<HostDownloads | null> = (async () => {
  const host = (window as unknown as { claude?: { use?: (name: string) => Promise<unknown> } })
    .claude;
  if (!host?.use) return null;
  try {
    return ((await host.use('downloads')) as HostDownloads | null) ?? null;
  } catch {
    return null;
  }
})();

export type SaveOutcome = 'saved' | 'declined' | 'too-large' | 'browser';

/**
 * Hands the file to the viewer by whichever route this context allows.
 * `browser` means the plain download was triggered — which the caller should
 * back up with a visible copy of the result, since embedders can swallow it.
 */
export async function saveImage(blob: Blob, filename: string): Promise<SaveOutcome> {
  const downloads = await hostDownloads;

  if (downloads) {
    try {
      await downloads.save({ filename, data: blob });
      return 'saved';
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === 'declined') return 'declined';
      if (code === 'too_large') return 'too-large';
      // Anything else: fall through and let the browser try.
    }
  }

  downloadBlob(blob, filename);
  return 'browser';
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
