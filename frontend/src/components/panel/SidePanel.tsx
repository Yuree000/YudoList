import { useListStore } from '../../stores/listStore';
import { AiPanel } from './AiPanel';

// ── Activity helpers ──────────────────────────────────────────────────────────

const ACTIVITY_KEY = 'yudolist_activity';

function getActivityLog(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function buildDays(count: number) {
  const log = getActivityLog();
  const days = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const completed = log[dateStr] ?? 0;
    const label = d.toLocaleDateString('zh-CN', { weekday: 'short' }).replace('周', '');
    days.push({ dateStr, completed, label, isToday: i === 0 });
  }
  return days;
}

// ── WeekActivity ──────────────────────────────────────────────────────────────

function WeekActivity() {
  const setSelectedDate = useListStore((state) => state.setSelectedDate);
  const selectedDate = useListStore((state) => state.selectedDate);

  // Re-read activity log each render so newly completed items show up
  const days = buildDays(14);
  const maxVal = Math.max(1, ...days.map((d) => d.completed));

  return (
    <div>
      <p className="section-kicker mb-3">近两周完成</p>
      <div className="flex items-end gap-1">
        {days.map(({ dateStr, completed, label, isToday }) => {
          const heightPct = completed / maxVal;
          const isSelected = selectedDate === dateStr;
          return (
            <button
              key={dateStr}
              type="button"
              title={`${dateStr}  完成 ${completed} 条`}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className="group flex flex-1 flex-col items-center gap-1 transition"
            >
              {/* Bar */}
              <div
                className="w-full rounded-full transition-all duration-300"
                style={{
                  height: `${Math.max(4, Math.round(heightPct * 48))}px`,
                  backgroundColor:
                    completed === 0
                      ? 'var(--color-border)'
                      : isSelected
                        ? 'var(--color-primary)'
                        : isToday
                          ? 'color-mix(in srgb, var(--color-primary) 70%, transparent)'
                          : 'color-mix(in srgb, var(--color-primary) 45%, transparent)',
                }}
              />
              {/* Day label */}
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

      {days.every((d) => d.completed === 0) && (
        <p className="mt-3 text-xs muted-copy">完成任务后这里会记录你的成果</p>
      )}
    </div>
  );
}


// ── SidePanel ─────────────────────────────────────────────────────────────────

export function SidePanel() {
  return (
    <div className="flex flex-col gap-4">
      {/* Activity chart */}
      <div className="paper-panel px-5 py-5">
        <WeekActivity />
      </div>

      {/* AI Panel */}
      <div className="paper-panel flex flex-1 flex-col px-5 py-5">
        <AiPanel />
      </div>
    </div>
  );
}
