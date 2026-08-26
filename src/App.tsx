import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Download,
  Eraser,
  Image as ImageIcon,
  Maximize,
  MousePointer2,
  Redo2,
  RotateCcw,
  ScanText,
  Sparkles,
  Type,
  Undo2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { Background, Layer, Rect, TextLayer, Tool } from './types';
import {
  createImageLayer,
  createTextLayer,
  defaultCover,
  editorReducer,
  initialState,
} from './state/editor';
import { getAsset, getAssetPixels } from './lib/assets';
import { dataUrlToAsset, fileToAsset } from './lib/image';
import { analyzeRegion } from './lib/color';
import { detectTextRegions } from './lib/textDetect';
import { suggestFontSize } from './lib/textLayout';
import { ensureFontLoaded } from './lib/fonts';
import { coversApply } from './lib/render';
import { createDemoBanner } from './lib/demo';
import { usePatches } from './hooks/usePatches';
import CanvasStage from './components/CanvasStage';
import LayerList from './components/LayerList';
import Inspector from './components/Inspector';
import BackgroundPanel from './components/BackgroundPanel';
import UploadScreen from './components/UploadScreen';
import ExportDialog from './components/ExportDialog';
import { Button, Field, Section, Slider } from './components/ui';

type ImageTarget = { kind: 'source' } | { kind: 'background' } | { kind: 'layer'; id: string } | { kind: 'newLayer' };

const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

function overlapRatio(a: Rect, b: Rect): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const area = x * y;
  if (area === 0) return 0;
  return area / Math.min(a.width * a.height, b.width * b.height);
}

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const { doc, selectedId } = state;

  const [tool, setTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [effectiveScale, setEffectiveScale] = useState(1);
  const [fontTick, setFontTick] = useState(0);
  const [detections, setDetections] = useState<Rect[]>([]);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [rightTab, setRightTab] = useState<'layer' | 'background'>('background');
  const [showExport, setShowExport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageTargetRef = useRef<ImageTarget>({ kind: 'source' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { deps, renderKey } = usePatches(doc);
  const selectedLayer = useMemo(
    () => doc.layers.find((layer) => layer.id === selectedId) ?? null,
    [doc.layers, selectedId],
  );

  const flash = useCallback((message: string) => {
    setStatus(message);
    setTimeout(() => setStatus((current) => (current === message ? null : current)), 2600);
  }, []);

  /* ---------------------------------------------------------------- loading */

  const loadSourceFile = useCallback(
    async (file: Blob) => {
      setBusy(true);
      setError(null);
      try {
        const asset = await fileToAsset(file);
        dispatch({ type: 'loadSource', assetId: asset.id, width: asset.width, height: asset.height });
        setDetections([]);
        setRightTab('background');
        setZoom('fit');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '图片加载失败');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const openPicker = useCallback((target: ImageTarget) => {
    imageTargetRef.current = target;
    fileInputRef.current?.click();
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.from(files).find((candidate) => candidate.type.startsWith('image/'));
      if (!file) {
        setError('请选择图片文件');
        return;
      }

      const target = imageTargetRef.current;
      if (target.kind === 'source' || !doc.sourceAssetId) {
        await loadSourceFile(file);
        return;
      }

      setBusy(true);
      try {
        const asset = await fileToAsset(file, file.name);

        if (target.kind === 'background') {
          dispatch({
            type: 'setBackground',
            background: {
              kind: 'image',
              assetId: asset.id,
              fit: 'cover',
              scale: 1,
              offsetX: 0,
              offsetY: 0,
              blur: 0,
              brightness: 100,
              saturate: 100,
            },
          });
          flash('背景已替换');
        } else if (target.kind === 'layer') {
          dispatch({ type: 'patchLayer', id: target.id, patch: { assetId: asset.id, name: file.name } });
        } else {
          const width = Math.round(doc.width * 0.3);
          const height = Math.round((width * asset.height) / asset.width);
          const layer = createImageLayer(
            {
              x: Math.round((doc.width - width) / 2),
              y: Math.round((doc.height - height) / 2),
              width,
              height,
            },
            asset.id,
            { name: file.name },
          );
          dispatch({ type: 'addLayer', layer });
          setRightTab('layer');
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '图片加载失败');
      } finally {
        setBusy(false);
        imageTargetRef.current = { kind: 'source' };
      }
    },
    [doc.height, doc.sourceAssetId, doc.width, flash, loadSourceFile],
  );

  const loadDemo = useCallback(async () => {
    setBusy(true);
    try {
      const asset = await dataUrlToAsset(createDemoBanner(), 'demo-banner.png');
      dispatch({ type: 'loadSource', assetId: asset.id, width: asset.width, height: asset.height });
      setDetections([]);
      setZoom('fit');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '示例加载失败');
    } finally {
      setBusy(false);
    }
  }, []);

  /* -------------------------------------------------------------- detection */

  const runDetection = useCallback(() => {
    const image = getAsset(doc.sourceAssetId);
    if (!image) return;

    const found = detectTextRegions(image, { sensitivity });
    // Hide anything already handled by an existing layer.
    const fresh = found.filter(
      (rect) => !doc.layers.some((layer) => overlapRatio(rect, layer) > 0.45),
    );
    setDetections(fresh);
    flash(fresh.length ? `识别到 ${fresh.length} 处文字区域` : '没有找到明显的文字区域，试试降低识别灵敏度或手动框选');
  }, [doc.layers, doc.sourceAssetId, flash, sensitivity]);

  const buildReplacementLayer = useCallback(
    (rect: Rect, text: string): TextLayer => {
      const pixels = getAssetPixels(doc.sourceAssetId);
      if (!pixels) {
        return createTextLayer(rect, {
          name: '替换文字',
          text,
          fontSize: suggestFontSize(rect.height),
          cover: defaultCover(true, rect.height),
        });
      }

      const analysis = analyzeRegion(pixels, rect);
      const plate = analysis.plate;

      // A badge or button keeps its shape: the layer snaps to the plate and
      // repaints it behind the new copy, while the cover still erases the
      // original pixels underneath.
      const box = plate ? plate.rect : rect;

      return createTextLayer(box, {
        name: plate ? '替换文字（含底色块）' : '替换文字',
        text,
        color: analysis.ink,
        fontSize: suggestFontSize(box.height),
        cover: { ...defaultCover(true, box.height), color: analysis.surround },
        pill: plate
          ? {
              enabled: true,
              color: plate.color,
              radius: Math.round(plate.radius),
              paddingX: Math.round(box.width * 0.08),
              paddingY: Math.round(box.height * 0.12),
              fit: 'box',
            }
          : {
              enabled: false,
              color: '#D9FF00',
              radius: 999,
              paddingX: 24,
              paddingY: 12,
              fit: 'text',
            },
      });
    },
    [doc.sourceAssetId],
  );

  const acceptDetection = useCallback(
    (rect: Rect) => {
      const layer = buildReplacementLayer(rect, '替换文字');
      dispatch({ type: 'addLayer', layer });
      setDetections((current) => current.filter((candidate) => candidate !== rect));
      setRightTab('layer');
      requestAnimationFrame(() => textareaRef.current?.select());
    },
    [buildReplacementLayer],
  );

  const acceptAllDetections = useCallback(() => {
    if (detections.length === 0) return;
    const layers = detections.map((rect) => buildReplacementLayer(rect, '替换文字'));
    dispatch({ type: 'addLayers', layers });
    setDetections([]);
    setRightTab('layer');
  }, [buildReplacementLayer, detections]);

  const eraseAllDetections = useCallback(() => {
    if (detections.length === 0) return;
    const layers = detections.map((rect) => {
      const layer = buildReplacementLayer(rect, '');
      return { ...layer, name: '已抹除' };
    });
    dispatch({ type: 'addLayers', layers });
    setDetections([]);
    flash('已抹除识别到的文字，可在图层里逐个补上新文案');
  }, [buildReplacementLayer, detections, flash]);

  const dismissDetection = useCallback((rect: Rect) => {
    setDetections((current) => current.filter((candidate) => candidate !== rect));
  }, []);

  /* ------------------------------------------------------------ layer edits */

  const patchLayer = useCallback(
    (id: string, patch: Partial<Layer>, transient = false) => {
      dispatch({ type: 'patchLayer', id, patch, skipHistory: transient });
    },
    [],
  );

  const patchSelected = useCallback(
    (patch: Partial<Layer>, transient = false) => {
      if (!selectedId) return;
      patchLayer(selectedId, patch, transient);
    },
    [patchLayer, selectedId],
  );

  const checkpoint = useCallback(() => dispatch({ type: 'checkpoint' }), []);

  const handleDrawRect = useCallback(
    (rect: Rect) => {
      if (tool === 'text') {
        dispatch({ type: 'addLayer', layer: buildReplacementLayer(rect, '替换文字') });
        setRightTab('layer');
        requestAnimationFrame(() => textareaRef.current?.select());
      } else if (tool === 'image') {
        imageTargetRef.current = { kind: 'newLayer' };
        fileInputRef.current?.click();
      }
      setTool('select');
    },
    [buildReplacementLayer, tool],
  );

  const sampleColors = useCallback(() => {
    if (!selectedLayer || selectedLayer.kind !== 'text') return;
    const pixels = getAssetPixels(doc.sourceAssetId);
    if (!pixels) return;
    const analysis = analyzeRegion(pixels, selectedLayer);
    patchSelected({
      color: analysis.ink,
      cover: { ...selectedLayer.cover, color: analysis.surround },
    });
    flash('已从原图取色');
  }, [doc.sourceAssetId, flash, patchSelected, selectedLayer]);

  /* --------------------------------------------------------------- lifecycle */

  useEffect(() => {
    if (selectedLayer) setRightTab('layer');
  }, [selectedLayer?.id]);

  // Canvas draws with the fonts loaded at that instant, so pull in any webfont
  // a text layer needs and repaint once it lands.
  useEffect(() => {
    const wanted = doc.layers.filter((layer): layer is TextLayer => layer.kind === 'text');
    if (wanted.length === 0) return;

    let cancelled = false;
    void Promise.all(
      wanted.map((layer) => ensureFontLoaded(layer.fontFamily, layer.fontWeight, layer.italic)),
    ).then(() => {
      if (!cancelled) setFontTick((tick) => tick + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [doc.layers]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile();
      if (!file) return;
      event.preventDefault();
      imageTargetRef.current = doc.sourceAssetId ? { kind: 'newLayer' } : { kind: 'source' };
      void handleFiles([file]);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [doc.sourceAssetId, handleFiles]);

  useEffect(() => {
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      if (!event.dataTransfer?.files.length) return;
      imageTargetRef.current = doc.sourceAssetId ? { kind: 'newLayer' } : { kind: 'source' };
      void handleFiles(event.dataTransfer.files);
    };
    const onDragOver = (event: DragEvent) => event.preventDefault();
    window.addEventListener('drop', onDrop);
    window.addEventListener('dragover', onDragOver);
    return () => {
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragover', onDragOver);
    };
  }, [doc.sourceAssetId, handleFiles]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if (meta && event.key.toLowerCase() === 'd' && selectedId) {
        event.preventDefault();
        dispatch({ type: 'duplicateLayer', id: selectedId });
        return;
      }
      if (typing) return;

      if (event.key === 'Escape') {
        setTool('select');
        dispatch({ type: 'select', id: null });
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        dispatch({ type: 'removeLayer', id: selectedId });
        return;
      }
      if (!meta && ['v', 't', 'i'].includes(event.key.toLowerCase())) {
        setTool(event.key.toLowerCase() === 'v' ? 'select' : event.key.toLowerCase() === 't' ? 'text' : 'image');
        return;
      }
      if (selectedId && event.key.startsWith('Arrow')) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const layer = doc.layers.find((candidate) => candidate.id === selectedId);
        if (!layer) return;
        const delta = {
          ArrowLeft: { x: -step, y: 0 },
          ArrowRight: { x: step, y: 0 },
          ArrowUp: { x: 0, y: -step },
          ArrowDown: { x: 0, y: step },
        }[event.key];
        if (!delta) return;
        patchLayer(selectedId, { x: layer.x + delta.x, y: layer.y + delta.y });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [doc.layers, patchLayer, selectedId]);

  /* ------------------------------------------------------------------- zoom */

  const zoomBy = useCallback(
    (direction: 1 | -1) => {
      const current = zoom === 'fit' ? effectiveScale : zoom;
      const index = ZOOM_STEPS.findIndex((step) => step > current + 0.001);
      const next =
        direction === 1
          ? ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, index === -1 ? ZOOM_STEPS.length - 1 : index)]
          : ZOOM_STEPS[Math.max(0, (index === -1 ? ZOOM_STEPS.length : index) - 2)];
      setZoom(next);
    },
    [effectiveScale, zoom],
  );

  const hasSource = Boolean(doc.sourceAssetId);

  return (
    <div className="flex h-screen flex-col bg-[#0C0E14]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {/* ------------------------------------------------------------ top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#1D212B] px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D9FF00] text-[#0C0E14]">
            <Wand2 size={15} />
          </span>
          <span className="text-sm font-extrabold tracking-tight text-white">BannerForge</span>
        </div>

        {hasSource ? (
          <>
            <span className="ml-2 hidden text-[11px] tabular-nums text-[#5A6270] sm:inline">
              {doc.width} × {doc.height}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <IconAction
                title="撤销 (⌘Z)"
                disabled={state.past.length === 0}
                onClick={() => dispatch({ type: 'undo' })}
              >
                <Undo2 size={15} />
              </IconAction>
              <IconAction
                title="重做 (⇧⌘Z)"
                disabled={state.future.length === 0}
                onClick={() => dispatch({ type: 'redo' })}
              >
                <Redo2 size={15} />
              </IconAction>

              <span className="mx-1 h-5 w-px bg-[#232833]" />

              <IconAction title="缩小" onClick={() => zoomBy(-1)}>
                <ZoomOut size={15} />
              </IconAction>
              <button
                type="button"
                onClick={() => setZoom('fit')}
                className="min-w-[52px] rounded-md px-2 py-1 text-[11px] font-semibold tabular-nums text-[#8A93A6] hover:bg-[#181C24] hover:text-white"
                title="适应窗口"
              >
                {Math.round(effectiveScale * 100)}%
              </button>
              <IconAction title="放大" onClick={() => zoomBy(1)}>
                <ZoomIn size={15} />
              </IconAction>
              <IconAction title="适应窗口" onClick={() => setZoom('fit')}>
                <Maximize size={14} />
              </IconAction>

              <span className="mx-1 h-5 w-px bg-[#232833]" />

              <IconAction title="换一张图" onClick={() => openPicker({ kind: 'source' })}>
                <RotateCcw size={14} />
              </IconAction>
              <Button variant="primary" className="ml-1" onClick={() => setShowExport(true)}>
                <Download size={13} /> 导出
              </Button>
            </div>
          </>
        ) : null}
      </header>

      {!hasSource ? (
        <main className="min-h-0 flex-1">
          <UploadScreen
            busy={busy}
            error={error}
            onPickFile={() => openPicker({ kind: 'source' })}
            onFiles={(files) => {
              imageTargetRef.current = { kind: 'source' };
              void handleFiles(files);
            }}
            onDemo={loadDemo}
          />
        </main>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* --------------------------------------------------- left sidebar */}
          <aside className="flex w-[248px] shrink-0 flex-col border-r border-[#1D212B] bg-[#0F1219]">
            <div className="border-b border-[#20242F] p-3">
              <div className="mb-3 grid grid-cols-3 gap-1.5">
                <ToolButton
                  active={tool === 'select'}
                  onClick={() => setTool('select')}
                  icon={<MousePointer2 size={15} />}
                  label="选择"
                  hint="V"
                />
                <ToolButton
                  active={tool === 'text'}
                  onClick={() => setTool('text')}
                  icon={<Type size={15} />}
                  label="替换文字"
                  hint="T"
                />
                <ToolButton
                  active={tool === 'image'}
                  onClick={() => setTool('image')}
                  icon={<ImageIcon size={15} />}
                  label="替换图片"
                  hint="I"
                />
              </div>
              <p className="text-[11px] leading-relaxed text-[#5A6270]">
                {tool === 'select'
                  ? '点击画布上的图层进行编辑，双击文字可快速改文案。'
                  : '在画布上拖出一个矩形，框住要替换的区域。'}
              </p>
            </div>

            <Section
              title="自动识别文字"
              action={
                <button
                  type="button"
                  onClick={runDetection}
                  className="flex items-center gap-1 rounded-md bg-[#1C212B] px-2 py-1 text-[10px] font-bold text-[#D9FF00] hover:bg-[#242A36]"
                >
                  <ScanText size={11} /> 识别
                </button>
              }
            >
              <Field label="识别灵敏度" hint={sensitivity < 0.4 ? '宽松' : sensitivity > 0.7 ? '严格' : '适中'}>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={sensitivity}
                  onChange={setSensitivity}
                />
              </Field>

              {detections.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-[#8A93A6]">
                    找到 <span className="font-bold text-[#D9FF00]">{detections.length}</span> 处候选区域，
                    把鼠标移到画布上的虚线框选择处理方式。
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button variant="ghost" onClick={acceptAllDetections}>
                      <Sparkles size={12} /> 全部替换
                    </Button>
                    <Button variant="ghost" onClick={eraseAllDetections}>
                      <Eraser size={12} /> 全部抹除
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-[#5A6270]">
                  点「识别」自动框出画面里的文案区域，也可以直接用「替换文字」工具手动框选。
                </p>
              )}
            </Section>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-4 pt-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6F7889]">
                  图层
                </h3>
                <span className="text-[10px] tabular-nums text-[#5A6270]">{doc.layers.length}</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
                <LayerList
                  layers={doc.layers}
                  selectedId={selectedId}
                  onSelect={(id) => dispatch({ type: 'select', id })}
                  onPatch={patchLayer}
                  onRemove={(id) => dispatch({ type: 'removeLayer', id })}
                  onDuplicate={(id) => dispatch({ type: 'duplicateLayer', id })}
                  onReorder={(id, direction) => dispatch({ type: 'reorderLayer', id, direction })}
                />
              </div>
            </div>
          </aside>

          {/* ---------------------------------------------------------- stage */}
          <main className="relative min-w-0 flex-1">
            <CanvasStage
              doc={doc}
              deps={deps}
              renderKey={renderKey + fontTick}
              tool={tool}
              zoom={zoom}
              selectedId={selectedId}
              detections={detections}
              onScaleChange={setEffectiveScale}
              onSelect={(id) => dispatch({ type: 'select', id })}
              onDrawRect={handleDrawRect}
              onLayerChange={patchLayer}
              onCheckpoint={checkpoint}
              onAcceptDetection={acceptDetection}
              onDismissDetection={dismissDetection}
              onEditText={(id) => {
                dispatch({ type: 'select', id });
                setRightTab('layer');
                requestAnimationFrame(() => textareaRef.current?.select());
              }}
            />

            {status ? (
              <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 animate-fade-up rounded-full border border-[#2A303D] bg-[#161A22]/95 px-4 py-2 text-xs font-medium text-[#D5DAE4] shadow-xl">
                {status}
              </div>
            ) : null}
          </main>

          {/* -------------------------------------------------- right sidebar */}
          <aside className="flex w-[292px] shrink-0 flex-col border-l border-[#1D212B] bg-[#0F1219]">
            <div className="flex shrink-0 gap-1 border-b border-[#1D212B] p-2">
              <TabButton
                active={rightTab === 'layer'}
                onClick={() => setRightTab('layer')}
                disabled={!selectedLayer}
              >
                图层属性
              </TabButton>
              <TabButton active={rightTab === 'background'} onClick={() => setRightTab('background')}>
                背景
              </TabButton>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
              {rightTab === 'layer' && selectedLayer ? (
                <Inspector
                  layer={selectedLayer}
                  textareaRef={textareaRef}
                  onPatch={patchSelected}
                  onCheckpoint={checkpoint}
                  onReplaceImage={() => openPicker({ kind: 'layer', id: selectedLayer.id })}
                  onSampleColors={sampleColors}
                  coversDisabled={!coversApply(doc)}
                />
              ) : rightTab === 'layer' ? (
                <p className="px-4 py-8 text-center text-xs leading-relaxed text-[#5A6270]">
                  选中一个图层后在这里调整文字、颜色和位置。
                </p>
              ) : (
                <BackgroundPanel
                  doc={doc}
                  onSetBackground={(background: Background) =>
                    dispatch({ type: 'setBackground', background })
                  }
                  onSetOverlay={(overlay) => dispatch({ type: 'setOverlay', overlay })}
                  onUploadBackground={() => openPicker({ kind: 'background' })}
                  onCheckpoint={checkpoint}
                />
              )}
            </div>
          </aside>
        </div>
      )}

      {showExport ? (
        <ExportDialog doc={doc} deps={deps} onClose={() => setShowExport(false)} />
      ) : null}
    </div>
  );
}

function IconAction({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-2 text-[#8A93A6] transition-colors hover:bg-[#181C24] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} (${hint})`}
      className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors ${
        active
          ? 'border-[#D9FF00]/60 bg-[#D9FF00]/10 text-[#D9FF00]'
          : 'border-[#242A36] bg-[#141821] text-[#8A93A6] hover:border-[#333B4B] hover:text-white'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
        active ? 'bg-[#232A36] text-white' : 'text-[#7A8397] hover:bg-[#181C24] hover:text-[#C4CBD8]'
      }`}
    >
      {children}
    </button>
  );
}
