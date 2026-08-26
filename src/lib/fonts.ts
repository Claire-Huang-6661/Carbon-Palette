export interface FontOption {
  /** Stable key stored on the layer. */
  id: string;
  label: string;
  /** Full CSS family stack used for canvas rendering. */
  stack: string;
  /** Family name to hand to document.fonts.load(). */
  loadFamily?: string;
  weights: number[];
  cjk: boolean;
}

export const FONTS: FontOption[] = [
  {
    id: 'noto-sans-sc',
    label: '思源黑体 Noto Sans SC',
    stack: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    loadFamily: 'Noto Sans SC',
    weights: [300, 400, 500, 700, 900],
    cjk: true,
  },
  {
    id: 'noto-serif-sc',
    label: '思源宋体 Noto Serif SC',
    stack: '"Noto Serif SC", "Songti SC", "SimSun", serif',
    loadFamily: 'Noto Serif SC',
    weights: [300, 400, 600, 700, 900],
    cjk: true,
  },
  {
    id: 'plus-jakarta',
    label: 'Plus Jakarta Sans',
    stack: '"Plus Jakarta Sans", "Noto Sans SC", sans-serif',
    loadFamily: 'Plus Jakarta Sans',
    weights: [300, 400, 500, 600, 700, 800],
    cjk: false,
  },
  {
    id: 'inter',
    label: 'Inter',
    stack: 'Inter, "Noto Sans SC", sans-serif',
    loadFamily: 'Inter',
    weights: [300, 400, 500, 600, 700, 800, 900],
    cjk: false,
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    stack: 'Montserrat, "Noto Sans SC", sans-serif',
    loadFamily: 'Montserrat',
    weights: [300, 400, 600, 700, 800, 900],
    cjk: false,
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    stack: '"Playfair Display", "Noto Serif SC", serif',
    loadFamily: 'Playfair Display',
    weights: [400, 600, 700, 900],
    cjk: false,
  },
  {
    id: 'oswald',
    label: 'Oswald',
    stack: 'Oswald, "Noto Sans SC", sans-serif',
    loadFamily: 'Oswald',
    weights: [300, 400, 600, 700],
    cjk: false,
  },
  {
    id: 'bebas',
    label: 'Bebas Neue',
    stack: '"Bebas Neue", Impact, "Noto Sans SC", sans-serif',
    loadFamily: 'Bebas Neue',
    weights: [400],
    cjk: false,
  },
  {
    id: 'system-sans',
    label: '系统无衬线',
    stack: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
    weights: [300, 400, 500, 600, 700, 800, 900],
    cjk: true,
  },
  {
    id: 'system-serif',
    label: '系统衬线',
    stack: 'Georgia, "Songti SC", "SimSun", serif',
    weights: [400, 700],
    cjk: true,
  },
  {
    id: 'system-mono',
    label: '等宽',
    stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    weights: [400, 500, 700],
    cjk: false,
  },
];

const byId = new Map(FONTS.map((font) => [font.id, font]));

export function getFont(id: string): FontOption {
  return byId.get(id) ?? FONTS[0];
}

export function fontStack(id: string): string {
  return getFont(id).stack;
}

/**
 * Canvas draws with whatever is loaded at that instant, so a webfont that is
 * still downloading silently renders as a fallback. Resolving this before the
 * next paint keeps the preview and the export identical.
 */
export async function ensureFontLoaded(id: string, weight: number, italic: boolean): Promise<void> {
  const font = getFont(id);
  if (!font.loadFamily || typeof document === 'undefined' || !document.fonts) return;
  const spec = `${italic ? 'italic ' : ''}${weight} 64px "${font.loadFamily}"`;
  try {
    await document.fonts.load(spec, '替换文字 Replace Text 0123');
  } catch {
    // A missing webfont is not fatal; the stack falls back.
  }
}

export function nearestWeight(id: string, weight: number): number {
  const { weights } = getFont(id);
  return weights.reduce((best, current) =>
    Math.abs(current - weight) < Math.abs(best - weight) ? current : best,
  );
}
