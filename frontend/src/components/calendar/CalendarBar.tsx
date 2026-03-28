import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getLocalToday, parseLocalDate, shiftLocalDate } from '../../lib/localDate';
import { useListStore } from '../../stores/listStore';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDisplay(date: string): string {
  const d = parseLocalDate(date);
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0=Sun … 6=Sat, we shift to Mon=0
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

// ── MonthPicker ───────────────────────────────────────────────────────────────

interface MonthPickerProps {
  current: string; // "YYYY-MM-DD"
  onSelect: (date: string) => void;
  onClose: () => void;
}

function MonthPicker({ current, onSelect, onClose }: MonthPickerProps) {
  const [view, setView] = useState(() => {
    const d = parseLocalDate(current || getLocalToday());
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const t = getLocalToday();
  const daysInMonth = getDaysInMonth(view.year, view.month);
  const firstDay = getFirstDayOfMonth(view.year, view.month);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    setView((v) =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 },
    );
  };
  const nextMonth = () => {
    setView((v) =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 },
    );
  };

  const toDateStr = (day: number) =>
    `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.16 }}
      className="paper-panel absolute top-full left-0 z-50 mt-2 w-72 p-4 shadow-xl"
      style={{ minWidth: 288 }}
    >
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full transition hover:opacity-70"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold">
          {view.year} 年 {view.month + 1} 月
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full transition hover:opacity-70"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-xs muted-copy">
            {w}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <span key={idx} />;
          const ds = toDateStr(day);
          const isToday = ds === t;
          const isSelected = ds === current;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => { onSelect(ds); onClose(); }}
              className="flex h-8 w-full items-center justify-center rounded-full text-sm transition"
              style={{
                backgroundColor: isSelected
                  ? 'var(--color-primary)'
                  : isToday
                    ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                    : 'transparent',
                color: isSelected ? '#fff' : 'var(--color-text)',
                fontWeight: isToday || isSelected ? 600 : 400,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Today shortcut */}
      <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
        <button
          type="button"
          onClick={() => { onSelect(getLocalToday()); onClose(); }}
          className="w-full rounded-full py-1.5 text-xs transition hover:opacity-70"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          回到今天
        </button>
      </div>
    </motion.div>
  );
}

// ── CalendarBar ───────────────────────────────────────────────────────────────

export function CalendarBar() {
  const selectedDate = useListStore((state) => state.selectedDate);
  const setSelectedDate = useListStore((state) => state.setSelectedDate);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const active = selectedDate ?? getLocalToday();

  const go = (days: number) => {
    setSelectedDate(shiftLocalDate(active, days));
  };

  return (
    <div className="flex items-center gap-2">
      {/* Prev day */}
      <button
        type="button"
        onClick={() => go(-1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:opacity-70"
        style={{ borderColor: 'var(--color-border)' }}
        aria-label="前一天"
      >
        <ChevronLeft size={15} />
      </button>

      {/* Date display / calendar toggle */}
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition hover:opacity-80"
          style={{
            borderColor: selectedDate ? 'var(--color-primary)' : 'var(--color-border)',
            color: selectedDate ? 'var(--color-primary)' : 'var(--color-text)',
            backgroundColor: selectedDate
              ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
              : 'transparent',
          }}
        >
          <CalendarDays size={14} />
          {selectedDate ? formatDisplay(selectedDate) : '全部条目'}
        </button>

        <AnimatePresence>
          {open && (
            <MonthPicker
              current={active}
              onSelect={setSelectedDate}
              onClose={() => setOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Next day */}
      <button
        type="button"
        onClick={() => go(1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:opacity-70"
        style={{ borderColor: 'var(--color-border)' }}
        aria-label="后一天"
      >
        <ChevronRight size={15} />
      </button>

      {/* Clear date filter */}
      {selectedDate && (
        <button
          type="button"
          onClick={() => setSelectedDate(null)}
          className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:opacity-70"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          aria-label="查看全部"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
