import { useState, useMemo } from 'react';
import { X, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useListStore } from '../../stores/listStore';

interface RecurringModalProps {
  onClose: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(date: string, months: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function RecurringModal({ onClose }: RecurringModalProps) {
  const createItem = useListStore((state) => state.createItem);

  const [text, setText] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(addMonths(today(), 1));
  // Mon=0 … Sun=6; default = all days checked
  const [weekdays, setWeekdays] = useState<boolean[]>([true, true, true, true, true, true, true]);
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  const matchingDates = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return [];
    const dates: string[] = [];
    const cur = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    while (cur <= end) {
      const dow = (cur.getDay() + 6) % 7; // Mon=0 … Sun=6
      if (weekdays[dow]) {
        dates.push(cur.toISOString().slice(0, 10));
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate, weekdays]);

  const toggleDay = (i: number) => {
    setWeekdays((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const handleCreate = async () => {
    if (!text.trim() || matchingDates.length === 0) return;
    setCreating(true);
    try {
      for (const date of matchingDates) {
        await createItem({ text: text.trim(), dueDate: date });
      }
      setDone(true);
      setTimeout(onClose, 800);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-text) 40%, transparent)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="paper-panel w-full max-w-md p-6"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-lg font-semibold">创建循环事件</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="关闭"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Task name */}
            <div>
              <label className="section-kicker mb-1.5 block">事件名称</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="例如：健身 / 阅读 / 日报"
                className="w-full rounded-[1.2rem] border bg-transparent px-4 py-2.5 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                  // @ts-expect-error CSS custom property
                  '--tw-ring-color': 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
                }}
                autoFocus
              />
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="section-kicker mb-1.5 block">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-[1.2rem] border bg-transparent px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="section-kicker mb-1.5 block">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-[1.2rem] border bg-transparent px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            {/* Day of week selector */}
            <div>
              <label className="section-kicker mb-2 block">重复日期</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className="flex-1 rounded-full py-1.5 text-xs font-medium transition"
                    style={{
                      backgroundColor: weekdays[i]
                        ? 'var(--color-primary)'
                        : 'transparent',
                      color: weekdays[i] ? '#fff' : 'var(--color-text-muted)',
                      border: `1px solid ${weekdays[i] ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div
              className="rounded-[1.2rem] border px-4 py-3 text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              {matchingDates.length === 0
                ? '无匹配日期，请调整日期范围或重复规则'
                : `将创建 ${matchingDates.length} 条任务（${startDate} 至 ${endDate}）`}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border py-2.5 text-sm transition hover:opacity-70"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={!text.trim() || matchingDates.length === 0 || creating || done}
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition"
                style={{
                  backgroundColor:
                    done ? 'var(--color-success)' : 'var(--color-primary)',
                  color: '#fff',
                  opacity: creating || matchingDates.length === 0 || !text.trim() ? 0.6 : 1,
                }}
              >
                {creating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    创建中…
                  </>
                ) : done ? (
                  '已完成 ✓'
                ) : (
                  `批量创建 ${matchingDates.length} 条`
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
