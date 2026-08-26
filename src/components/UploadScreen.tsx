import React, { useState } from 'react';
import { ImagePlus, Layers, ScanText, Wand2 } from 'lucide-react';

export default function UploadScreen({
  onPickFile,
  onFiles,
  onDemo,
  busy,
  error,
}: {
  onPickFile: () => void;
  onFiles: (files: FileList | File[]) => void;
  onDemo: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-6 scroll-thin">
      <div className="w-full max-w-2xl animate-fade-up">
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2A303D] bg-[#161A22] px-3 py-1.5 text-[11px] font-semibold text-[#8A93A6]">
            <Wand2 size={12} className="text-[#D9FF00]" />
            头图 / Banner 二次创作
          </span>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            上传头图，替换文字和背景
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-[#8A93A6]">
            自动框出画面里的文字，一键抹掉旧内容换成你的新文案；背景也能整张替换成新图、渐变或纯色。
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
          }}
          className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            dragging ? 'border-[#D9FF00] bg-[#D9FF00]/5' : 'border-[#2A303D] bg-[#12151C]'
          }`}
        >
          <ImagePlus size={36} className="mx-auto mb-4 text-[#4F5768]" />
          <p className="mb-1 text-sm font-semibold text-[#D5DAE4]">
            把图片拖进来，或直接 Ctrl / ⌘ + V 粘贴
          </p>
          <p className="mb-5 text-xs text-[#69727F]">支持 PNG、JPG、WebP，处理全程在你的浏览器里完成</p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onPickFile}
              className="rounded-lg bg-[#D9FF00] px-4 py-2.5 text-xs font-bold text-[#0C0E14] transition-colors hover:bg-[#E4FF4D] disabled:opacity-50"
            >
              {busy ? '正在读取…' : '选择图片'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDemo}
              className="rounded-lg border border-[#2A303D] bg-[#161A22] px-4 py-2.5 text-xs font-semibold text-[#C4CBD8] transition-colors hover:border-[#3A4256] hover:text-white disabled:opacity-50"
            >
              载入示例 Banner
            </button>
          </div>

          {error ? <p className="mt-4 text-xs text-[#E88C96]">{error}</p> : null}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Feature
            icon={<ScanText size={15} />}
            title="自动找文字"
            body="边缘密度分析定位文案区域，点一下就变成可编辑图层。"
          />
          <Feature
            icon={<Wand2 size={15} />}
            title="智能抹除"
            body="从四周像素向内插值补全背景，纯色和渐变几乎无痕。"
          />
          <Feature
            icon={<Layers size={15} />}
            title="图层化编辑"
            body="文字、图片、背景各自成层，随时撤销并导出原尺寸。"
          />
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-[#20242F] bg-[#12151C] p-4">
      <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#1C212B] text-[#D9FF00]">
        {icon}
      </span>
      <h3 className="mb-1 text-xs font-bold text-[#D5DAE4]">{title}</h3>
      <p className="text-[11px] leading-relaxed text-[#69727F]">{body}</p>
    </div>
  );
}
