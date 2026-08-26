import React from 'react';

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#20242F] px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6F7889]">
          {title}
        </h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-[#A7AEBD]">{label}</span>
        {hint ? <span className="text-[10px] tabular-nums text-[#69727F]">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
}) {
  return (
    <input
      type="range"
      className="w-full"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerDown={onCommit}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[#2A303D] bg-[#101319] px-2 focus-within:border-[#3E4657]">
      <input
        type="number"
        className="w-full bg-transparent py-1.5 text-xs tabular-nums text-[#E7EAF0] outline-none"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
      {suffix ? <span className="text-[10px] text-[#69727F]">{suffix}</span> : null}
    </div>
  );
}

export function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#2A303D] bg-[#101319] px-2 py-1.5">
      <input
        type="color"
        className="h-6 w-8 shrink-0"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className="w-full bg-transparent text-xs uppercase tabular-nums text-[#E7EAF0] outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-[#2A303D] bg-[#101319] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          onClick={() => onChange(option.value)}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            value === option.value
              ? 'bg-[#2C3342] text-white'
              : 'text-[#7A8397] hover:bg-[#1A1F29] hover:text-[#C4CBD8]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg px-0.5 py-1 text-left"
    >
      <span className="text-xs font-medium text-[#A7AEBD]">{label}</span>
      <span
        className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#D9FF00]' : 'bg-[#2E3444]'
        }`}
      >
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-[#0C0E14] transition-all ${
            checked ? 'left-[16px]' : 'left-[2px]'
          }`}
        />
      </span>
    </button>
  );
}

export function Button({
  variant = 'ghost',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger';
}) {
  const styles = {
    primary: 'bg-[#D9FF00] text-[#0C0E14] hover:bg-[#E4FF4D] disabled:bg-[#454B36]',
    ghost:
      'border border-[#2A303D] bg-[#161A22] text-[#C4CBD8] hover:border-[#3A4256] hover:text-white',
    subtle: 'text-[#8A93A6] hover:bg-[#1A1F29] hover:text-white',
    danger:
      'border border-[#3A2126] bg-[#1E1417] text-[#E88C96] hover:border-[#5A2F37] hover:text-[#FFB3BC]',
  }[variant];

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      className="w-full cursor-pointer rounded-lg border border-[#2A303D] bg-[#101319] px-2 py-1.5 text-xs text-[#E7EAF0] outline-none focus:border-[#3E4657]"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-[#101319]">
          {option.label}
        </option>
      ))}
    </select>
  );
}
