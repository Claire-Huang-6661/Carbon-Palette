export type AssetId = string;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * How the original pixels underneath a layer get erased.
 * `auto` interpolates from the pixels bordering the region, which reconstructs
 * flat and gradient backgrounds convincingly. `blur` smears the surroundings
 * over the region (better on photos). `solid` paints a flat colour.
 */
export type CoverMode = 'auto' | 'blur' | 'solid' | 'none';

export interface CoverSettings {
  enabled: boolean;
  mode: CoverMode;
  color: string;
  /** Expands the erased region beyond the layer box, in source pixels. */
  padding: number;
  /** Feathers the patch edge so it melts into the surroundings. */
  softness: number;
}

export type FitMode = 'cover' | 'contain' | 'fill';
export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

interface LayerCommon extends Rect {
  id: string;
  name: string;
  /** Degrees, clockwise, around the layer centre. */
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  cover: CoverSettings;
}

export interface TextLayer extends LayerCommon {
  kind: 'text';
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  /** Multiplier of the font size. */
  lineHeight: number;
  letterSpacing: number;
  color: string;
  align: HAlign;
  vAlign: VAlign;
  /** Shrinks the font until the text fits the box. */
  autoFit: boolean;
  uppercase: boolean;
  italic: boolean;
  strokeWidth: number;
  strokeColor: string;
  shadow: { enabled: boolean; x: number; y: number; blur: number; color: string };
  /** Backing plate behind the text. `box` fills the layer rect (used when a
   *  detected badge or button is rebuilt); `text` hugs the wrapped lines. */
  pill: {
    enabled: boolean;
    color: string;
    radius: number;
    paddingX: number;
    paddingY: number;
    fit: 'text' | 'box';
  };
}

export interface ImageLayer extends LayerCommon {
  kind: 'image';
  assetId: AssetId;
  fit: FitMode;
  radius: number;
  filters: { blur: number; brightness: number; saturate: number };
}

export type Layer = TextLayer | ImageLayer;

export type Background =
  | { kind: 'original' }
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number }
  | {
      kind: 'image';
      assetId: AssetId;
      fit: FitMode;
      scale: number;
      offsetX: number;
      offsetY: number;
      blur: number;
      brightness: number;
      saturate: number;
    };

export interface Doc {
  sourceAssetId: AssetId | null;
  width: number;
  height: number;
  background: Background;
  overlay: { enabled: boolean; color: string; opacity: number };
  /** Bottom-most first. */
  layers: Layer[];
}

export type Tool = 'select' | 'text' | 'image';
