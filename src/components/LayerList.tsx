import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import type { Layer } from '../types';

export default function LayerList({
  layers,
  selectedId,
  onSelect,
  onPatch,
  onRemove,
  onDuplicate,
  onReorder,
}: {
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: Partial<Layer>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}) {
  if (layers.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-xs leading-relaxed text-[#69727F]">
        还没有图层。
        <br />
        用「自动识别文字」或框选一块区域开始替换。
      </p>
    );
  }

  return (
    <ul className="space-y-1 px-2 py-2">
      {[...layers].reverse().map((layer) => {
        const isSelected = layer.id === selectedId;
        const label =
          layer.kind === 'text' ? layer.text.replace(/\n/g, ' ').trim() || '空文字' : layer.name;

        return (
          <li key={layer.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(layer.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(layer.id)}
              className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
                isSelected ? 'bg-[#232A36] ring-1 ring-[#D9FF00]/50' : 'hover:bg-[#191D26]'
              }`}
            >
              <span className={`shrink-0 ${isSelected ? 'text-[#D9FF00]' : 'text-[#69727F]'}`}>
                {layer.kind === 'text' ? <Type size={13} /> : <ImageIcon size={13} />}
              </span>

              <span
                className={`min-w-0 flex-1 truncate text-xs ${
                  layer.visible ? 'text-[#D5DAE4]' : 'text-[#5A6270] line-through'
                }`}
                title={label}
              >
                {label}
              </span>

              <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <IconButton
                  title="上移一层"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorder(layer.id, 'up');
                  }}
                >
                  <ChevronUp size={13} />
                </IconButton>
                <IconButton
                  title="下移一层"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorder(layer.id, 'down');
                  }}
                >
                  <ChevronDown size={13} />
                </IconButton>
                <IconButton
                  title="复制图层"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(layer.id);
                  }}
                >
                  <Copy size={12} />
                </IconButton>
                <IconButton
                  title="删除图层"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(layer.id);
                  }}
                >
                  <Trash2 size={12} />
                </IconButton>
              </span>

              <IconButton
                title={layer.locked ? '解锁' : '锁定'}
                onClick={(e) => {
                  e.stopPropagation();
                  onPatch(layer.id, { locked: !layer.locked });
                }}
              >
                {layer.locked ? <Lock size={12} /> : <Unlock size={12} className="opacity-40" />}
              </IconButton>

              <IconButton
                title={layer.visible ? '隐藏' : '显示'}
                onClick={(e) => {
                  e.stopPropagation();
                  onPatch(layer.id, { visible: !layer.visible });
                }}
              >
                {layer.visible ? <Eye size={12} /> : <EyeOff size={12} className="opacity-40" />}
              </IconButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded p-1 text-[#7A8397] transition-colors hover:bg-[#2C3342] hover:text-white"
    >
      {children}
    </button>
  );
}
