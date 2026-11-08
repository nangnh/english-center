interface ProgressBarProps {
  value: number; // 0..max
  max: number;
  label?: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      {label && (
        <div className="mb-1 text-sm font-semibold text-garden-ink">{label}</div>
      )}
      <div
        className="h-4 w-full overflow-hidden rounded-full bg-garden-sky"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? "Tiến độ"}
      >
        <div
          className="h-full rounded-full bg-garden-grass transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
