import type { TextLayer } from '../types';
import { fontStack } from './fonts';

let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureContext) {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    measureContext = canvas.getContext('2d')!;
  }
  return measureContext;
}

export function fontShorthand(layer: TextLayer, fontSize: number): string {
  return `${layer.italic ? 'italic ' : ''}${layer.fontWeight} ${fontSize}px ${fontStack(layer.fontFamily)}`;
}

const supportsLetterSpacing =
  typeof CanvasRenderingContext2D !== 'undefined' &&
  'letterSpacing' in CanvasRenderingContext2D.prototype;

export function applyLetterSpacing(ctx: CanvasRenderingContext2D, spacing: number): void {
  if (supportsLetterSpacing) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
  }
}

export function resetLetterSpacing(ctx: CanvasRenderingContext2D): void {
  applyLetterSpacing(ctx, 0);
}

// CJK radicals, symbols/punctuation, unified ideographs, compatibility
// ideographs and fullwidth forms — all of which may break per character.
const CJK = /[\u2E80-\u9FFF\u3000-\u303F\uF900-\uFAFF\uFF00-\uFFEF]/;

/**
 * Splits into the smallest chunks a line may break at: whole words for Latin,
 * single characters for CJK. Trailing spaces stay attached to their word so
 * they do not start a line.
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let buffer = '';

  const flush = () => {
    if (buffer) {
      tokens.push(buffer);
      buffer = '';
    }
  };

  for (const char of text) {
    if (CJK.test(char)) {
      flush();
      tokens.push(char);
    } else if (char === ' ') {
      buffer += char;
      flush();
    } else {
      buffer += char;
    }
  }
  flush();
  return tokens;
}

export interface TextLayout {
  lines: string[];
  fontSize: number;
  lineHeightPx: number;
  blockHeight: number;
  maxLineWidth: number;
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): { lines: string[]; maxLineWidth: number } {
  const lines: string[] = [];
  let maxLineWidth = 0;

  for (const paragraph of text.split('\n')) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }

    let current = '';
    for (const token of tokenize(paragraph)) {
      const candidate = current + token;
      const width = ctx.measureText(candidate.trimEnd()).width;
      if (current && width > maxWidth) {
        lines.push(current.trimEnd());
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(current.trimEnd()).width);
        current = token.trimStart();
      } else {
        current = candidate;
      }
    }

    lines.push(current.trimEnd());
    maxLineWidth = Math.max(maxLineWidth, ctx.measureText(current.trimEnd()).width);
  }

  return { lines, maxLineWidth };
}

/**
 * Layout always runs at scale 1 so the preview and the full-resolution export
 * break lines in exactly the same places.
 */
export function layoutText(layer: TextLayer): TextLayout {
  const ctx = getMeasureContext();
  const content = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  const innerWidth = Math.max(1, layer.width - (layer.pill.enabled ? layer.pill.paddingX * 2 : 0));
  const innerHeight = Math.max(
    1,
    layer.height - (layer.pill.enabled ? layer.pill.paddingY * 2 : 0),
  );

  const minSize = 6;
  let fontSize = Math.max(minSize, layer.fontSize);
  let result = { lines: [] as string[], maxLineWidth: 0 };

  for (;;) {
    ctx.font = fontShorthand(layer, fontSize);
    applyLetterSpacing(ctx, layer.letterSpacing);
    result = wrap(ctx, content, innerWidth);
    resetLetterSpacing(ctx);

    if (!layer.autoFit) break;

    const blockHeight = result.lines.length * fontSize * layer.lineHeight;
    if ((blockHeight <= innerHeight && result.maxLineWidth <= innerWidth) || fontSize <= minSize) {
      break;
    }
    fontSize = Math.max(minSize, Math.floor(fontSize * 0.94));
  }

  const lineHeightPx = fontSize * layer.lineHeight;
  return {
    lines: result.lines,
    fontSize,
    lineHeightPx,
    blockHeight: result.lines.length * lineHeightPx,
    maxLineWidth: result.maxLineWidth,
  };
}

/** Font size that makes a single line of `text` roughly fill `box`. */
export function suggestFontSize(boxHeight: number): number {
  return Math.max(8, Math.round(boxHeight * 0.74));
}
