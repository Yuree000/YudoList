import { useEffect, useMemo, useState } from 'react';
import { Loader2, PencilLine, RefreshCw, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ApiClientError, api } from '../../lib/api';
import { addMonthsToLocalDate, getLocalToday, parseLocalDate } from '../../lib/localDate';
import type {
  CreateRecurringSeriesPayload,
  ItemCategory,
  RecurringSeries,
} from '../../sharedTypes';
import { useListStore } from '../../stores/listStore';

interface RecurringModalProps {
  onClose: () => void;
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const CATEGORY_OPTIONS: Array<{ value: ItemCategory | null; label: string }> = [
  { value: null, label: '无标签' },
  { value: '学习', label: '学习' },
  { value: '生活', label: '生活' },
  { value: '工作', label: '工作' },
];

interface FormState {
  text: string;
  startDate: string;
  endDate: string;
  weekdays: boolean[];
  category: ItemCategory | null;
  startTime: string | null;
  endTime: string | null;
}

function createDefaultForm(): FormState {
  return {
    text: '',
    startDate: getLocalToday(),
    endDate: addMonthsToLocalDate(getLocalToday(), 1),
    weekdays: [true, true, true, true, true, true, true],
    category: null,
    startTime: null,
    endTime: null,
  };
}

function weekdaysToMask(weekdays: boolean[]) {
  return weekdays.reduce((mask, enabled, index) => {
    if (!enabled) {
      return mask;
    }

    return mask | (1 << index);
  }, 0);
}

function maskToWeekdays(mask: number) {
  return Array.from({ length: 7 }, (_, index) => (mask & (1 << index)) !== 0);
}

function formFromSeries(series: RecurringSeries): FormState {
  return {
    text: series.text,
    startDate: series.startDate,
    endDate: series.endDate,
    weekdays: maskToWeekdays(series.weekdaysMask),
    category: series.category,
    startTime: series.startTime,
    endTime: series.endTime,
  };
}

function summarizeWeekdays(mask: number) {
  return DAY_LABELS.filter((_, index) => (mask & (1 << index)) !== 0).join(' / ');
}

function toPayload(form: FormState): CreateRecurringSeriesPayload {
  return {
    text: form.text.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    weekdaysMask: weekdaysToMask(form.weekdays),
    category: form.category,
    startTime: form.startTime,
    endTime: form.endTime,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case 400:
        return error.message;
      case 401:
        return '登录已失效，请重新登录后再试。';
      default:
        return error.message;
    }
  }

  return '操作失败，请稍后再试。';
}

export function RecurringModal({ onClose }: RecurringModalProps) {
  const loadItems = useListStore((state) => state.loadItems);

  const [form, setForm] = useState<FormState>(createDefaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seriesList, setSeriesList] = useState<RecurringSeries[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekdaysMask = useMemo(() => weekdaysToMask(form.weekdays), [form.weekdays]);
  const previewCount = useMemo(() => {
    if (!form.startDate || !form.endDate || form.startDate > form.endDate || weekdaysMask === 0) {
      return 0;
    }

    let count = 0;
    const cursor = parseLocalDate(form.startDate);
    const end = parseLocalDate(form.endDate);
    while (cursor <= end) {
      const weekday = (cursor.getDay() + 6) % 7;
      if ((weekdaysMask & (1 << weekday)) !== 0) {
        count += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }, [form.endDate, form.startDate, weekdaysMask]);

  async function refreshSeries() {
    setLoadingList(true);
    try {
      const nextSeries = await api.get<RecurringSeries[]>('/recurring');
      setSeriesList(nextSeries);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void refreshSeries();
  }, []);

  const resetForm = () => {
    setForm(createDefaultForm());
    setEditingId(null);
    setError(null);
  };

  const toggleDay = (index: number) => {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.map((value, dayIndex) => (dayIndex === index ? !value : value)),
    }));
  };

  const handleSave = async () => {
    if (!form.text.trim() || weekdaysMask === 0 || form.startDate > form.endDate) {
      setError('请填写名称，并确保日期范围与重复规则有效。');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (editingId) {
        await api.patch<RecurringSeries>(`/recurring/${editingId}`, payload);
      } else {
        await api.post<RecurringSeries>('/recurring', payload);
      }

      await Promise.all([refreshSeries(), loadItems().catch(() => undefined)]);
      if (!editingId) {
        resetForm();
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  };

  const handleStop = async (seriesId: string) => {
    setStoppingId(seriesId);
    setError(null);
    try {
      await api.delete<RecurringSeries>(`/recurring/${seriesId}`);
      await Promise.all([refreshSeries(), loadItems().catch(() => undefined)]);
      if (editingId === seriesId) {
        resetForm();
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setStoppingId(null);
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
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          className="paper-panel w-full max-w-4xl p-6"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.18 }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-lg font-semibold">
                {editingId ? '编辑重复系列' : '创建重复系列'}
              </h2>
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

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
            <div className="space-y-4">
              <div>
                <label className="section-kicker mb-1.5 block">事项名称</label>
                <input
                  type="text"
                  value={form.text}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, text: event.target.value }))
                  }
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-kicker mb-1.5 block">开始日期</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, startDate: event.target.value }))
                    }
                    className="w-full rounded-[1.2rem] border bg-transparent px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label className="section-kicker mb-1.5 block">结束日期</label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, endDate: event.target.value }))
                    }
                    className="w-full rounded-[1.2rem] border bg-transparent px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="section-kicker mb-2 block">重复日期</label>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className="flex-1 rounded-full py-1.5 text-xs font-medium transition"
                      style={{
                        backgroundColor: form.weekdays[index] ? 'var(--color-primary)' : 'transparent',
                        color: form.weekdays[index] ? '#fff' : 'var(--color-text-muted)',
                        border: `1px solid ${form.weekdays[index] ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-kicker mb-1.5 block">开始时间</label>
                  <input
                    type="time"
                    value={form.startTime ?? ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startTime: event.target.value || null,
                      }))
                    }
                    className="w-full rounded-[1.2rem] border bg-transparent px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label className="section-kicker mb-1.5 block">结束时间</label>
                  <input
                    type="time"
                    value={form.endTime ?? ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endTime: event.target.value || null,
                      }))
                    }
                    className="w-full rounded-[1.2rem] border bg-transparent px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="section-kicker mb-2 block">默认标签</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((option) => {
                    const active = form.category === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, category: option.value }))}
                        className="rounded-full px-3 py-1.5 text-xs transition"
                        style={{
                          border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          backgroundColor: active
                            ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                            : 'transparent',
                          color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="rounded-[1.2rem] border px-4 py-3 text-sm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                {previewCount === 0
                  ? '当前规则下不会生成任何任务，请调整日期范围或星期。'
                  : `当前规则会生成 ${previewCount} 条任务。`}
              </div>

              {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={editingId ? resetForm : onClose}
                  className="flex-1 rounded-full border py-2.5 text-sm transition hover:opacity-70"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  {editingId ? '取消编辑' : '关闭'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!form.text.trim() || previewCount === 0 || saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    opacity: saving || previewCount === 0 || !form.text.trim() ? 0.6 : 1,
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      保存中...
                    </>
                  ) : editingId ? (
                    '保存系列'
                  ) : (
                    `创建系列（${previewCount} 条）`
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-kicker">已有系列</p>
                {loadingList && <Loader2 size={14} className="animate-spin" />}
              </div>

              <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                {!loadingList && seriesList.length === 0 && (
                  <div
                    className="rounded-[1.2rem] border px-4 py-4 text-sm"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    还没有重复系列，先在左侧创建一个。
                  </div>
                )}

                {seriesList.map((series) => {
                  const isEditing = editingId === series.id;
                  const stopping = stoppingId === series.id;
                  return (
                    <div
                      key={series.id}
                      className="rounded-[1.2rem] border px-4 py-3"
                      style={{
                        borderColor: isEditing ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: isEditing
                          ? 'color-mix(in srgb, var(--color-primary) 6%, transparent)'
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{series.text}</p>
                          <p className="mt-1 text-xs muted-copy">
                            {series.startDate} 至 {series.endDate}
                          </p>
                          <p className="mt-1 text-xs muted-copy">
                            {summarizeWeekdays(series.weekdaysMask)}
                          </p>
                          {(series.startTime || series.endTime || series.category || series.pausedAt) && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {series.category && (
                                <span className="rounded-full border px-2 py-0.5 text-[10px]">
                                  {series.category}
                                </span>
                              )}
                              {(series.startTime || series.endTime) && (
                                <span className="rounded-full border px-2 py-0.5 text-[10px]">
                                  {series.startTime ?? '--:--'} - {series.endTime ?? '--:--'}
                                </span>
                              )}
                              {series.pausedAt && (
                                <span className="rounded-full border px-2 py-0.5 text-[10px]">
                                  已停止
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(series.id);
                              setForm(formFromSeries(series));
                              setError(null);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:opacity-80"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                            aria-label="编辑系列"
                          >
                            <PencilLine size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStop(series.id)}
                            disabled={stopping}
                            className="flex h-8 w-8 items-center justify-center rounded-full border transition hover:opacity-80"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}
                            aria-label="停止系列"
                          >
                            {stopping ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
