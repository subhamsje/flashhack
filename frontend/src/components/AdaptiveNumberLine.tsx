import React from 'react';
import type { Interval } from '../services/warehouseApi';

interface AdaptiveNumberLineProps {
  intervals: Interval[];
  gaps: Interval[];
  lastArrivalId?: number;
}

export const AdaptiveNumberLine: React.FC<AdaptiveNumberLineProps> = ({
  intervals,
  gaps,
  lastArrivalId
}) => {
  if (intervals.length === 0) {
    return (
      <div className="p-4 border border-dashed border-border rounded-lg text-center font-mono text-xs text-muted">
        Number-line is empty. Ingest packages to populate visual coordinates.
      </div>
    );
  }

  const minVal = intervals[0].start;
  const maxVal = intervals[intervals.length - 1].end;
  const span = maxVal - minVal + 1;

  // If span is manageable (<= 40 IDs), render discrete unit blocks
  const isDiscreteMode = span <= 40;

  if (isDiscreteMode) {
    const ids: number[] = [];
    for (let id = minVal; id <= maxVal; id++) {
      ids.push(id);
    }

    const isReceived = (id: number) => intervals.some(iv => id >= iv.start && id <= iv.end);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-muted">
          <span>Discrete Unit Mode (Span: {span} IDs)</span>
          <span>Range: [{minVal} ... {maxVal}]</span>
        </div>
        <div className="flex flex-wrap gap-1.5 p-3.5 bg-background border border-border rounded-lg items-center">
          {ids.map((id) => {
            const received = isReceived(id);
            const isJustAdded = lastArrivalId === id;

            return (
              <div
                key={id}
                className={`w-9 h-9 rounded flex flex-col items-center justify-center font-mono text-xs font-bold transition-all transform ${
                  isJustAdded ? 'scale-110 ring-2 ring-primary ring-offset-1 z-10' : ''
                } ${
                  received
                    ? 'bg-received text-white shadow-xs'
                    : 'bg-missing/20 text-missing border border-dashed border-missing/60'
                }`}
                title={received ? `Received ID ${id}` : `Missing ID ${id}`}
              >
                <span>{id}</span>
                <span className="text-[8px] font-sans opacity-70">
                  {received ? '✓' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Large span mode: Proportional continuous bar with segment breakdown
  const segments: { type: 'received' | 'gap'; start: number; end: number; widthPercent: number }[] = [];

  let cur = minVal;
  const allRanges = [
    ...intervals.map(iv => ({ ...iv, type: 'received' as const })),
    ...gaps.map(g => ({ ...g, type: 'gap' as const }))
  ].sort((a, b) => a.start - b.start);

  allRanges.forEach(r => {
    const width = Math.max(0.5, ((r.end - r.start + 1) / span) * 100);
    segments.push({
      type: r.type,
      start: r.start,
      end: r.end,
      widthPercent: width
    });
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono text-muted">
        <span>Sparse Proportional Mode (Total Span: {span.toLocaleString()} IDs)</span>
        <span>[{minVal.toLocaleString()} ━━━━━━━━ {maxVal.toLocaleString()}]</span>
      </div>

      {/* Proportional Segmented Bar */}
      <div className="h-7 w-full bg-border rounded-md overflow-hidden flex shadow-inner border border-border">
        {segments.map((seg, idx) => (
          <div
            key={idx}
            style={{ width: `${seg.widthPercent}%` }}
            className={`h-full transition-all group relative cursor-pointer ${
              seg.type === 'received'
                ? 'bg-received hover:brightness-110'
                : 'bg-missing/40 hover:bg-missing/60 border-l border-r border-missing/20'
            }`}
          >
            {/* Tooltip on hover */}
            <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-text text-white text-[10px] font-mono rounded shadow pointer-events-none whitespace-nowrap z-20">
              {seg.type === 'received' ? 'Received' : 'Gap'}: [{seg.start.toLocaleString()} ... {seg.end.toLocaleString()}] (
              {(seg.end - seg.start + 1).toLocaleString()} IDs)
            </div>
          </div>
        ))}
      </div>

      {/* Proportional Labels */}
      <div className="flex justify-between text-[11px] font-mono text-muted">
        <span>Start: {minVal.toLocaleString()}</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-received inline-block" /> Received
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-missing inline-block" /> Missing Gap
          </span>
        </div>
        <span>End: {maxVal.toLocaleString()}</span>
      </div>
    </div>
  );
};
