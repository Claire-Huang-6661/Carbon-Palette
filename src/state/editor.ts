import type {
  Background,
  CoverSettings,
  Doc,
  ImageLayer,
  Layer,
  Rect,
  TextLayer,
} from '../types';

let layerCounter = 0;

export function newId(prefix: string): string {
  return `${prefix}-${++layerCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultCover(enabled: boolean, height: number): CoverSettings {
  return {
    enabled,
    mode: 'auto',
    color: '#FFFFFF',
    padding: Math.max(2, Math.round(height * 0.08)),
    softness: Math.max(1, Math.round(height * 0.05)),
  };
}

export function createTextLayer(rect: Rect, overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    kind: 'text',
    id: newId('text'),
    name: '文字图层',
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    cover: defaultCover(false, rect.height),
    text: '在这里输入文字',
    fontFamily: 'noto-sans-sc',
    fontWeight: 700,
    fontSize: Math.max(12, Math.round(rect.height * 0.74)),
    lineHeight: 1.25,
    letterSpacing: 0,
    color: '#111318',
    align: 'center',
    vAlign: 'middle',
    autoFit: true,
    uppercase: false,
    italic: false,
    strokeWidth: 0,
    strokeColor: '#000000',
    shadow: { enabled: false, x: 0, y: 2, blur: 8, color: 'rgba(0,0,0,0.45)' },
    pill: { enabled: false, color: '#D9FF00', radius: 999, paddingX: 24, paddingY: 12, fit: 'text' },
    ...overrides,
  };
}

export function createImageLayer(
  rect: Rect,
  assetId: string,
  overrides: Partial<ImageLayer> = {},
): ImageLayer {
  return {
    kind: 'image',
    id: newId('image'),
    name: '图片图层',
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    cover: defaultCover(false, rect.height),
    assetId,
    fit: 'cover',
    radius: 0,
    filters: { blur: 0, brightness: 100, saturate: 100 },
    ...overrides,
  };
}

export function emptyDoc(): Doc {
  return {
    sourceAssetId: null,
    width: 1200,
    height: 480,
    background: { kind: 'original' },
    overlay: { enabled: false, color: '#000000', opacity: 0.25 },
    layers: [],
  };
}

export interface EditorState {
  doc: Doc;
  past: Doc[];
  future: Doc[];
  selectedId: string | null;
}

export type Action =
  | { type: 'checkpoint' }
  | { type: 'loadSource'; assetId: string; width: number; height: number }
  | { type: 'addLayer'; layer: Layer; select?: boolean }
  | { type: 'addLayers'; layers: Layer[] }
  | { type: 'patchLayer'; id: string; patch: Partial<Layer>; skipHistory?: boolean }
  | { type: 'removeLayer'; id: string }
  | { type: 'duplicateLayer'; id: string }
  | { type: 'reorderLayer'; id: string; direction: 'up' | 'down' | 'top' | 'bottom' }
  | { type: 'setBackground'; background: Background }
  | { type: 'setOverlay'; overlay: Partial<Doc['overlay']> }
  | { type: 'select'; id: string | null }
  | { type: 'reset' }
  | { type: 'undo' }
  | { type: 'redo' };

const HISTORY_LIMIT = 60;

function clone(doc: Doc): Doc {
  return structuredClone(doc);
}

function commit(state: EditorState, doc: Doc, selectedId = state.selectedId): EditorState {
  return {
    doc,
    past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
    future: [],
    selectedId,
  };
}

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'checkpoint':
      return { ...state, past: [...state.past, clone(state.doc)].slice(-HISTORY_LIMIT), future: [] };

    case 'loadSource':
      return commit(
        state,
        {
          ...emptyDoc(),
          sourceAssetId: action.assetId,
          width: action.width,
          height: action.height,
        },
        null,
      );

    case 'addLayer':
      return commit(
        state,
        { ...state.doc, layers: [...state.doc.layers, action.layer] },
        action.select === false ? state.selectedId : action.layer.id,
      );

    case 'addLayers': {
      if (action.layers.length === 0) return state;
      return commit(
        state,
        { ...state.doc, layers: [...state.doc.layers, ...action.layers] },
        action.layers[action.layers.length - 1].id,
      );
    }

    case 'patchLayer': {
      const layers = state.doc.layers.map((layer) =>
        layer.id === action.id ? ({ ...layer, ...action.patch } as Layer) : layer,
      );
      const doc = { ...state.doc, layers };
      return action.skipHistory ? { ...state, doc } : commit(state, doc);
    }

    case 'removeLayer': {
      const doc = { ...state.doc, layers: state.doc.layers.filter((l) => l.id !== action.id) };
      return commit(state, doc, state.selectedId === action.id ? null : state.selectedId);
    }

    case 'duplicateLayer': {
      const source = state.doc.layers.find((l) => l.id === action.id);
      if (!source) return state;
      const copy = {
        ...structuredClone(source),
        id: newId(source.kind),
        name: `${source.name} 副本`,
        x: source.x + Math.round(source.width * 0.04) + 8,
        y: source.y + Math.round(source.height * 0.12) + 8,
      } as Layer;
      return commit(state, { ...state.doc, layers: [...state.doc.layers, copy] }, copy.id);
    }

    case 'reorderLayer': {
      const index = state.doc.layers.findIndex((l) => l.id === action.id);
      if (index === -1) return state;
      const layers = [...state.doc.layers];
      const [layer] = layers.splice(index, 1);
      const target =
        action.direction === 'up'
          ? Math.min(layers.length, index + 1)
          : action.direction === 'down'
            ? Math.max(0, index - 1)
            : action.direction === 'top'
              ? layers.length
              : 0;
      layers.splice(target, 0, layer);
      return commit(state, { ...state.doc, layers });
    }

    case 'setBackground':
      return commit(state, { ...state.doc, background: action.background });

    case 'setOverlay':
      return commit(state, {
        ...state.doc,
        overlay: { ...state.doc.overlay, ...action.overlay },
      });

    case 'select':
      return { ...state, selectedId: action.id };

    case 'reset':
      return { doc: emptyDoc(), past: [], future: [], selectedId: null };

    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        doc: previous,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future].slice(0, HISTORY_LIMIT),
        selectedId: previous.layers.some((l) => l.id === state.selectedId)
          ? state.selectedId
          : null,
      };
    }

    case 'redo': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        doc: next,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        selectedId: next.layers.some((l) => l.id === state.selectedId) ? state.selectedId : null,
      };
    }

    default:
      return state;
  }
}

export const initialState: EditorState = {
  doc: emptyDoc(),
  past: [],
  future: [],
  selectedId: null,
};
