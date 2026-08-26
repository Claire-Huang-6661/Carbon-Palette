import React, { useEffect, useState } from 'react';
import { Check, Clipboard, Download, X } from 'lucide-react';
import type { Doc } from '../types';
import type { RenderDeps } from '../lib/render';
import { renderToCanvas } from '../lib/render';
import { canvasToBlob, copyCanvasToClipboard, downloadBlob, type ExportFormat } from '../lib/download';
import { formatBytes } from '../lib/image';
import { Button, Field, Section, Segmented, Slider } from './ui';

export default function ExportDialog({
  doc,
  deps,
  onClose,
}: {
  doc: Doc;
  deps: RenderDeps;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(1);
  const [size, setSize] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const width = Math.round(doc.width * scale);
  const height = Math.round(doc.height * scale);

  // Estimate the output size so the quality slider means something.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const canvas = renderToCanvas(doc, deps, scale);
      const blob = await canvasToBlob(canvas, format, quality);
      if (!cancelled) setSize(blob?.size ?? null);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doc, deps, format, quality, scale]);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const canvas = renderToCanvas(doc, deps, scale);
      const blob = await canvasToBlob(canvas, format, quality);
      if (blob) {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
        downloadBlob(blob, `banner-${stamp}.${format === 'jpeg' ? 'jpg' : format}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    const canvas = renderToCanvas(doc, deps, scale);
    const ok = await copyCanvasToClipboard(canvas);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm animate-fade-up overflow-hidden rounded-2xl border border-[#262B38] bg-[#14171F] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#20242F] px-4 py-3">
          <h2 className="text-sm font-bold text-white">导出图片</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#7A8397] hover:bg-[#1F242E] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <Section title="格式">
          <Segmented
            value={format}
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'jpeg', label: 'JPG' },
              { value: 'webp', label: 'WebP' },
            ]}
            onChange={setFormat}
          />
          {format !== 'png' ? (
            <Field label="画质" hint={`${Math.round(quality * 100)}%`}>
              <Slider min={0.4} max={1} step={0.01} value={quality} onChange={setQuality} />
            </Field>
          ) : null}
        </Section>

        <Section title="尺寸">
          <Segmented
            value={String(scale)}
            options={[
              { value: '0.5', label: '50%' },
              { value: '1', label: '原尺寸' },
              { value: '2', label: '2×' },
            ]}
            onChange={(value) => setScale(Number(value))}
          />
          <p className="text-[11px] tabular-nums text-[#69727F]">
            {width} × {height} px
            {size !== null ? ` · 约 ${formatBytes(size)}` : ''}
          </p>
        </Section>

        <div className="flex gap-2 p-4">
          <Button variant="ghost" className="flex-1" onClick={handleCopy}>
            {copied ? <Check size={13} /> : <Clipboard size={13} />}
            {copied ? '已复制' : '复制'}
          </Button>
          <Button variant="primary" className="flex-[2]" disabled={busy} onClick={handleDownload}>
            <Download size={13} /> {busy ? '正在导出…' : '下载'}
          </Button>
        </div>
      </div>
    </div>
  );
}
