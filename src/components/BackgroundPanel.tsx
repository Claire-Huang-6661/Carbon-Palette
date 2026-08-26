import React from 'react';
import { Upload } from 'lucide-react';
import type { Background, Doc } from '../types';
import { Button, ColorField, Field, Section, Segmented, Slider, Toggle } from './ui';

const GRADIENT_PRESETS: { from: string; to: string; angle: number; label: string }[] = [
  { from: '#0F2027', to: '#2C5364', angle: 45, label: '深海' },
  { from: '#FF6A88', to: '#FF99AC', angle: 30, label: '蜜桃' },
  { from: '#141E30', to: '#243B55', angle: 90, label: '午夜' },
  { from: '#F7971E', to: '#FFD200', angle: 20, label: '暖阳' },
  { from: '#654EA3', to: '#EAAFC8', angle: 60, label: '紫霞' },
  { from: '#00B4DB', to: '#0083B0', angle: 45, label: '碧空' },
  { from: '#D9FF00', to: '#59A600', angle: 35, label: '电光' },
  { from: '#232526', to: '#414345', angle: 90, label: '石墨' },
];

export default function BackgroundPanel({
  doc,
  onSetBackground,
  onSetOverlay,
  onUploadBackground,
  onCheckpoint,
}: {
  doc: Doc;
  onSetBackground: (background: Background) => void;
  onSetOverlay: (overlay: Partial<Doc['overlay']>) => void;
  onUploadBackground: () => void;
  onCheckpoint: () => void;
}) {
  const background = doc.background;

  const switchKind = (kind: Background['kind']) => {
    if (kind === background.kind) return;
    if (kind === 'original') {
      onSetBackground({ kind: 'original' });
    } else if (kind === 'solid') {
      onSetBackground({ kind: 'solid', color: '#101319' });
    } else if (kind === 'gradient') {
      const preset = GRADIENT_PRESETS[0];
      onSetBackground({ kind: 'gradient', from: preset.from, to: preset.to, angle: preset.angle });
    } else {
      onUploadBackground();
    }
  };

  return (
    <>
      <Section title="背景">
        <Segmented
          value={background.kind}
          options={[
            { value: 'original', label: '原图' },
            { value: 'image', label: '换图' },
            { value: 'gradient', label: '渐变' },
            { value: 'solid', label: '纯色' },
          ]}
          onChange={switchKind}
        />

        {background.kind === 'original' ? (
          <p className="text-[11px] leading-relaxed text-[#69727F]">
            保留上传的原始头图作为背景。替换文字时会自动抹掉原有文字。
          </p>
        ) : null}

        {background.kind === 'solid' ? (
          <Field label="背景颜色">
            <ColorField
              value={background.color}
              onChange={(color) => onSetBackground({ ...background, color })}
            />
          </Field>
        ) : null}

        {background.kind === 'gradient' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-1.5">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.label}
                  onClick={() =>
                    onSetBackground({
                      kind: 'gradient',
                      from: preset.from,
                      to: preset.to,
                      angle: preset.angle,
                    })
                  }
                  className="h-8 rounded-md border border-[#2A303D] transition-transform hover:scale-105"
                  style={{
                    backgroundImage: `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})`,
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="起始色">
                <ColorField
                  value={background.from}
                  onChange={(from) => onSetBackground({ ...background, from })}
                />
              </Field>
              <Field label="结束色">
                <ColorField
                  value={background.to}
                  onChange={(to) => onSetBackground({ ...background, to })}
                />
              </Field>
            </div>
            <Field label="角度" hint={`${Math.round(background.angle)}°`}>
              <Slider
                min={0}
                max={360}
                value={background.angle}
                onCommit={onCheckpoint}
                onChange={(angle) => onSetBackground({ ...background, angle })}
              />
            </Field>
          </div>
        ) : null}

        {background.kind === 'image' ? (
          <div className="space-y-3">
            <Button variant="ghost" className="w-full" onClick={onUploadBackground}>
              <Upload size={13} /> 更换背景图片
            </Button>
            <Field label="填充方式">
              <Segmented
                value={background.fit}
                options={[
                  { value: 'cover', label: '裁剪填满' },
                  { value: 'contain', label: '完整显示' },
                  { value: 'fill', label: '拉伸' },
                ]}
                onChange={(fit) => onSetBackground({ ...background, fit })}
              />
            </Field>
            <Field label="缩放" hint={`${Math.round(background.scale * 100)}%`}>
              <Slider
                min={0.5}
                max={3}
                step={0.01}
                value={background.scale}
                onCommit={onCheckpoint}
                onChange={(scale) => onSetBackground({ ...background, scale })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="水平偏移" hint={`${Math.round(background.offsetX * 100)}%`}>
                <Slider
                  min={-0.5}
                  max={0.5}
                  step={0.005}
                  value={background.offsetX}
                  onCommit={onCheckpoint}
                  onChange={(offsetX) => onSetBackground({ ...background, offsetX })}
                />
              </Field>
              <Field label="垂直偏移" hint={`${Math.round(background.offsetY * 100)}%`}>
                <Slider
                  min={-0.5}
                  max={0.5}
                  step={0.005}
                  value={background.offsetY}
                  onCommit={onCheckpoint}
                  onChange={(offsetY) => onSetBackground({ ...background, offsetY })}
                />
              </Field>
            </div>
            <Field label="模糊" hint={`${background.blur.toFixed(1)} px`}>
              <Slider
                min={0}
                max={40}
                step={0.5}
                value={background.blur}
                onCommit={onCheckpoint}
                onChange={(blur) => onSetBackground({ ...background, blur })}
              />
            </Field>
            <Field label="亮度" hint={`${Math.round(background.brightness)}%`}>
              <Slider
                min={20}
                max={200}
                value={background.brightness}
                onCommit={onCheckpoint}
                onChange={(brightness) => onSetBackground({ ...background, brightness })}
              />
            </Field>
            <Field label="饱和度" hint={`${Math.round(background.saturate)}%`}>
              <Slider
                min={0}
                max={250}
                value={background.saturate}
                onCommit={onCheckpoint}
                onChange={(saturate) => onSetBackground({ ...background, saturate })}
              />
            </Field>
          </div>
        ) : null}
      </Section>

      <Section title="蒙层">
        <Toggle
          label="叠加一层色彩蒙层"
          checked={doc.overlay.enabled}
          onChange={(enabled) => onSetOverlay({ enabled })}
        />
        {doc.overlay.enabled ? (
          <div className="space-y-3">
            <Field label="蒙层颜色">
              <ColorField
                value={doc.overlay.color}
                onChange={(color) => onSetOverlay({ color })}
              />
            </Field>
            <Field label="浓度" hint={`${Math.round(doc.overlay.opacity * 100)}%`}>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={doc.overlay.opacity}
                onCommit={onCheckpoint}
                onChange={(opacity) => onSetOverlay({ opacity })}
              />
            </Field>
          </div>
        ) : null}
        <p className="text-[11px] leading-relaxed text-[#69727F]">
          换背景后文字仍会保留在原位置，可继续调整。
        </p>
      </Section>
    </>
  );
}
