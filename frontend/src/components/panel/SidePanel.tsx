import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiClientError, api } from '../../lib/api';
import { parseLocalDate } from '../../lib/localDate';
import type { ActivityDay } from '../../sharedTypes';
import { useListStore } from '../../stores/listStore';
import { AiPanel } from './AiPanel';

function WeekActivity() {
  const items = useListStore((state) => state.items);
  const selectedDate = useListStore((state) => state.selectedDate);
  const setSelectedDate = useListStore((state) => state.setSelectedDate);

  const [days, setDays] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const completionSignature = useMemo(
    () =>
      items
        .map((item) => `${item.id}:${item.completed}:${item.deletedAt ?? 'active'}`)
        .join('|'),
    [items],
  );

  useEffect(() => {
    let cancelled = false;

    const loadActivity = async () => {
      setLoading(true);
      setError(null);
      try {
        const nextDays = await api.get<ActivityDay[]>('/activity?days=14');
        if (!cancelled) {
          setDays(nextDays);
        }
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        if (nextError instanceof ApiClientError) {
          setError(nextError.message);
        } else {
          setError('加载活动记录失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, [completionSignature]);

  const maxValue = Math.max(1, ...days.map((day) => day.completedCount));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="section-kicker">近两周完成</p>
        {loading && <Loader2 size={13} className="animate-spin" />}
      </div>

      {error ? (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : (
        <div className="flex items-end gap-1">
          {days.map(({ date, completedCount }) => {
            const label = parseLocalDate(date)
              .toLocaleDateString('zh-CN', { weekday: 'short' })
              .replace('周', '');
            const isSelected = selectedDate === date;
            const isToday = date === days.at(-1)?.date;

            return (
              <button
                key={date}
                type="button"
                title={`${date} 完成 ${completedCount} 条`}
                onClick={() => setSelectedDate(isSelected ? null : date)}
                className="group flex flex-1 flex-col items-center gap-1 transition"
              >
                <div
                  className="w-full rounded-full transition-all duration-300"
                  style={{
                    height: `${Math.max(4, Math.round((completedCount / maxValue) * 48))}px`,
                    backgroundColor:
                      completedCount === 0
                        ? 'var(--color-border)'
                        : isSelected
                          ? 'var(--color-primary)'
                          : isToday
                            ? 'color-mix(in srgb, var(--color-primary) 70%, transparent)'
                            : 'color-mix(in srgb, var(--color-primary) 45%, transparent)',
                  }}
                />
                <span
                  className="text-[9px] transition"
                  style={{
                    color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!loading && !error && days.every((day) => day.completedCount === 0) && (
        <p className="mt-3 text-xs muted-copy">完成任务后，这里会显示你的真实记录</p>
      )}
    </div>
  );
}

export function SidePanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="paper-panel px-5 py-5">
        <WeekActivity />
      </div>

      <div className="paper-panel flex flex-1 flex-col px-5 py-5">
        <AiPanel />
      </div>
    </div>
  );
}
