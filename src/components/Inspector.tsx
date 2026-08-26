import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  FoldVertical,
  Replace,
  Sparkles,
} from 'lucide-react';
import type { CoverMode, ImageLayer, Layer, TextLayer } from '../types';
import { FONTS, getFont, nearestWeight } from '../lib/fonts';
import { Button, ColorField, Field, NumberInput, Section, Segmented, Select, Slider, Toggle } from './ui';

export interface InspectorProps {
  layer: Layer;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onPatch: (patch: Partial<Layer>, transient?: boolean) => void;
  onCheckpoint: () => void;
  onReplaceImage: () => void;
  onSampleColors: () => void;
  coversDisabled: boolean;
}

const COVER_MODES: { value: CoverMode; label: string; title: string }[] = [
  { value: 'auto', label: '智能', title: '从四周像素向内插值，适合纯色与渐变背景' },
  { value: 'blur', label: '模糊', title: '把周围像素糊开，适合照片背景' },
  { value: 'solid', label: '纯色', title: '用指定颜色平涂' },
  { value: 'none', label: '关闭', title: '保留原图内容' },
];

export default function Inspector(props: InspectorProps) {
  const { layer, onPatch, onCheckpoint, coversDisabled } = props;

  return (
    <>
      {layer.kind === 'text' ? <TextSection {...props} layer={layer} /> : null}
      {layer.kind === 'image' ? <ImageSection {...props} layer={layer} /> : null}

      <Section title="遮盖原内容">
        {coversDisabled ? (
          <p className="rounded-lg border border-[#2A303D] bg-[#101319] px-3 py-2 text-[11px] leading-relaxed text-[#7A8397]">
            背景已被替换，原图内容不再显示，因此无需遮盖。
          </p>
        ) : null}
        <div className={coversDisabled ? 'pointer-events-none opacity-40' : ''}>
          <Toggle
            label="擦除下方的原文字"
            checked={layer.cover.enabled}
            onChange={(enabled) => onPatch({ cover: { ...layer.cover, enabled } })}
          />
          {layer.cover.enabled ? (
            <div className="mt-3 space-y-3">
              <Field label="填充方式">
                <Segmented
                  value={layer.cover.mode}
                  options={COVER_MODES.map((m) => ({ value: m.value, label: m.label, title: m.title }))}
                  onChange={(mode) => onPatch({ cover: { ...layer.cover, mode } })}
                />
              </Field>
              {layer.cover.mode === 'solid' ? (
                <Field label="填充颜色">
                  <ColorField
                    value={layer.cover.color}
                    onChange={(color) => onPatch({ cover: { ...layer.cover, color } }, true)}
                  />
                </Field>
              ) : null}
              <Field label="外扩范围" hint={`${Math.round(layer.cover.padding)} px`}>
                <Slider
                  min={0}
                  max={80}
                  value={layer.cover.padding}
                  onCommit={onCheckpoint}
                  onChange={(padding) => onPatch({ cover: { ...layer.cover, padding } }, true)}
                />
              </Field>
              <Field label="边缘羽化" hint={`${Math.round(layer.cover.softness)} px`}>
                <Slider
                  min={0}
                  max={60}
                  value={layer.cover.softness}
                  onCommit={onCheckpoint}
                  onChange={(softness) => onPatch({ cover: { ...layer.cover, softness } }, true)}
                />
              </Field>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="位置与变换">
        <div className="grid grid-cols-2 gap-2">
          <Field label="X">
            <NumberInput value={layer.x} onChange={(x) => onPatch({ x })} suffix="px" />
          </Field>
          <Field label="Y">
            <NumberInput value={layer.y} onChange={(y) => onPatch({ y })} suffix="px" />
          </Field>
          <Field label="宽">
            <NumberInput value={layer.width} min={4} onChange={(width) => onPatch({ width })} suffix="px" />
          </Field>
          <Field label="高">
            <NumberInput value={layer.height} min={4} onChange={(height) => onPatch({ height })} suffix="px" />
          </Field>
        </div>
        <Field label="旋转" hint={`${Math.round(layer.rotation)}°`}>
          <Slider
            min={-180}
            max={180}
            value={layer.rotation}
            onCommit={onCheckpoint}
            onChange={(rotation) => onPatch({ rotation }, true)}
          />
        </Field>
        <Field label="不透明度" hint={`${Math.round(layer.opacity * 100)}%`}>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={layer.opacity}
            onCommit={onCheckpoint}
            onChange={(opacity) => onPatch({ opacity }, true)}
          />
        </Field>
      </Section>
    </>
  );
}

function TextSection({
  layer,
  textareaRef,
  onPatch,
  onCheckpoint,
  onSampleColors,
}: InspectorProps & { layer: TextLayer }) {
  const font = getFont(layer.fontFamily);

  return (
    <>
      <Section
        title="文字内容"
        action={
          <button
            type="button"
            onClick={onSampleColors}
            title="从原图取色，匹配被替换文字的配色"
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold text-[#8A93A6] transition-colors hover:bg-[#1A1F29] hover:text-[#D9FF00]"
          >
            <Sparkles size={11} /> 自动取色
          </button>
        }
      >
        <textarea
          ref={textareaRef}
          value={layer.text}
          rows={3}
          onChange={(e) => onPatch({ text: e.target.value }, true)}
          onFocus={onCheckpoint}
          className="w-full resize-y rounded-lg border border-[#2A303D] bg-[#101319] px-3 py-2 text-sm leading-relaxed text-[#E7EAF0] outline-none focus:border-[#3E4657]"
          placeholder="输入替换后的文字，回车可换行"
        />
      </Section>

      <Section title="字体">
        <Field label="字体家族">
          <Select
            value={layer.fontFamily}
            onChange={(fontFamily) =>
              onPatch({ fontFamily, fontWeight: nearestWeight(fontFamily, layer.fontWeight) })
            }
            options={FONTS.map((f) => ({ value: f.id, label: f.label }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="字重">
            <Select
              value={String(layer.fontWeight)}
              onChange={(value) => onPatch({ fontWeight: Number(value) })}
              options={font.weights.map((w) => ({ value: String(w), label: String(w) }))}
            />
          </Field>
          <Field label="字号">
            <NumberInput
              value={layer.fontSize}
              min={6}
              max={600}
              onChange={(fontSize) => onPatch({ fontSize })}
              suffix="px"
            />
          </Field>
        </div>
        <Toggle
          label="自动缩放以适应文本框"
          checked={layer.autoFit}
          onChange={(autoFit) => onPatch({ autoFit })}
        />
        <Field label="行高" hint={layer.lineHeight.toFixed(2)}>
          <Slider
            min={0.8}
            max={2.4}
            step={0.01}
            value={layer.lineHeight}
            onCommit={onCheckpoint}
            onChange={(lineHeight) => onPatch({ lineHeight }, true)}
          />
        </Field>
        <Field label="字间距" hint={`${layer.letterSpacing.toFixed(1)} px`}>
          <Slider
            min={-10}
            max={40}
            step={0.5}
            value={layer.letterSpacing}
            onCommit={onCheckpoint}
            onChange={(letterSpacing) => onPatch({ letterSpacing }, true)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="斜体" checked={layer.italic} onChange={(italic) => onPatch({ italic })} />
          <Toggle
            label="全大写"
            checked={layer.uppercase}
            onChange={(uppercase) => onPatch({ uppercase })}
          />
        </div>
      </Section>

      <Section title="对齐与颜色">
        <Field label="水平对齐">
          <Segmented
            value={layer.align}
            options={[
              { value: 'left', label: <AlignLeft size={13} />, title: '左对齐' },
              { value: 'center', label: <AlignCenter size={13} />, title: '居中' },
              { value: 'right', label: <AlignRight size={13} />, title: '右对齐' },
            ]}
            onChange={(align) => onPatch({ align })}
          />
        </Field>
        <Field label="垂直对齐">
          <Segmented
            value={layer.vAlign}
            options={[
              { value: 'top', label: <ArrowUpToLine size={13} />, title: '顶对齐' },
              { value: 'middle', label: <FoldVertical size={13} />, title: '垂直居中' },
              { value: 'bottom', label: <ArrowDownToLine size={13} />, title: '底对齐' },
            ]}
            onChange={(vAlign) => onPatch({ vAlign })}
          />
        </Field>
        <Field label="文字颜色">
          <ColorField value={layer.color} onChange={(color) => onPatch({ color }, true)} />
        </Field>
      </Section>

      <Section title="描边 / 阴影 / 色块">
        <Field label="描边粗细" hint={`${layer.strokeWidth.toFixed(1)} px`}>
          <Slider
            min={0}
            max={20}
            step={0.5}
            value={layer.strokeWidth}
            onCommit={onCheckpoint}
            onChange={(strokeWidth) => onPatch({ strokeWidth }, true)}
          />
        </Field>
        {layer.strokeWidth > 0 ? (
          <Field label="描边颜色">
            <ColorField
              value={layer.strokeColor}
              onChange={(strokeColor) => onPatch({ strokeColor }, true)}
            />
          </Field>
        ) : null}

        <Toggle
          label="投影"
          checked={layer.shadow.enabled}
          onChange={(enabled) => onPatch({ shadow: { ...layer.shadow, enabled } })}
        />
        {layer.shadow.enabled ? (
          <div className="grid grid-cols-3 gap-2">
            <Field label="X">
              <NumberInput
                value={layer.shadow.x}
                onChange={(x) => onPatch({ shadow: { ...layer.shadow, x } })}
              />
            </Field>
            <Field label="Y">
              <NumberInput
                value={layer.shadow.y}
                onChange={(y) => onPatch({ shadow: { ...layer.shadow, y } })}
              />
            </Field>
            <Field label="模糊">
              <NumberInput
                value={layer.shadow.blur}
                min={0}
                onChange={(blur) => onPatch({ shadow: { ...layer.shadow, blur } })}
              />
            </Field>
          </div>
        ) : null}

        <Toggle
          label="文字底色块"
          checked={layer.pill.enabled}
          onChange={(enabled) => onPatch({ pill: { ...layer.pill, enabled } })}
        />
        {layer.pill.enabled ? (
          <div className="space-y-3">
            <Field label="色块范围">
              <Segmented
                value={layer.pill.fit}
                options={[
                  { value: 'box', label: '铺满选框', title: '还原原来的按钮或徽章形状' },
                  { value: 'text', label: '包裹文字', title: '色块跟随文字长度伸缩' },
                ]}
                onChange={(fit) => onPatch({ pill: { ...layer.pill, fit } })}
              />
            </Field>
            <Field label="色块颜色">
              <ColorField
                value={layer.pill.color}
                onChange={(color) => onPatch({ pill: { ...layer.pill, color } }, true)}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="圆角">
                <NumberInput
                  value={layer.pill.radius}
                  min={0}
                  onChange={(radius) => onPatch({ pill: { ...layer.pill, radius } })}
                />
              </Field>
              <Field label="左右内距">
                <NumberInput
                  value={layer.pill.paddingX}
                  min={0}
                  onChange={(paddingX) => onPatch({ pill: { ...layer.pill, paddingX } })}
                />
              </Field>
              <Field label="上下内距">
                <NumberInput
                  value={layer.pill.paddingY}
                  min={0}
                  onChange={(paddingY) => onPatch({ pill: { ...layer.pill, paddingY } })}
                />
              </Field>
            </div>
          </div>
        ) : null}
      </Section>
    </>
  );
}

function ImageSection({
  layer,
  onPatch,
  onCheckpoint,
  onReplaceImage,
}: InspectorProps & { layer: ImageLayer }) {
  return (
    <Section title="图片内容">
      <Button variant="ghost" className="w-full" onClick={onReplaceImage}>
        <Replace size={13} /> 更换这张图片
      </Button>
      <Field label="填充方式">
        <Segmented
          value={layer.fit}
          options={[
            { value: 'cover', label: '裁剪填满' },
            { value: 'contain', label: '完整显示' },
            { value: 'fill', label: '拉伸' },
          ]}
          onChange={(fit) => onPatch({ fit })}
        />
      </Field>
      <Field label="圆角" hint={`${Math.round(layer.radius)} px`}>
        <Slider
          min={0}
          max={400}
          value={layer.radius}
          onCommit={onCheckpoint}
          onChange={(radius) => onPatch({ radius }, true)}
        />
      </Field>
      <Field label="模糊" hint={`${layer.filters.blur.toFixed(1)} px`}>
        <Slider
          min={0}
          max={40}
          step={0.5}
          value={layer.filters.blur}
          onCommit={onCheckpoint}
          onChange={(blur) => onPatch({ filters: { ...layer.filters, blur } }, true)}
        />
      </Field>
      <Field label="亮度" hint={`${Math.round(layer.filters.brightness)}%`}>
        <Slider
          min={20}
          max={200}
          value={layer.filters.brightness}
          onCommit={onCheckpoint}
          onChange={(brightness) => onPatch({ filters: { ...layer.filters, brightness } }, true)}
        />
      </Field>
      <Field label="饱和度" hint={`${Math.round(layer.filters.saturate)}%`}>
        <Slider
          min={0}
          max={250}
          value={layer.filters.saturate}
          onCommit={onCheckpoint}
          onChange={(saturate) => onPatch({ filters: { ...layer.filters, saturate } }, true)}
        />
      </Field>
    </Section>
  );
}
