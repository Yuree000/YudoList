import { useState } from 'react';
import { Check, CheckCircle2, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { ApiClientError, api } from '../../lib/api';
import { useListStore } from '../../stores/listStore';
import type {
  AiParseActionItem,
  AiParseCreateItem,
  AiParseResult,
  ItemCategory,
} from '../../sharedTypes';

interface ActionPreviewItem extends AiParseActionItem {
  text: string;
  dueDate: string | null;
}

interface PreviewResult {
  creates: AiParseCreateItem[];
  completes: ActionPreviewItem[];
  deletes: ActionPreviewItem[];
}

const CATEGORY_COLORS: Record<ItemCategory, { color: string; bg: string }> = {
  学习: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  生活: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  工作: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

function TimeBadge({ startTime, endTime }: { startTime: string | null; endTime: string | null }) {
  if (!startTime && !endTime) return null;

  let label = '';
  if (startTime && endTime) {
    label = `${startTime} - ${endTime}`;
  } else if (startTime) {
    label = `${startTime} 开始`;
  } else if (endTime) {
    label = `${endTime} 结束`;
  }

  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px]"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)',
        color: 'var(--color-text-muted)',
      }}
    >
      {label}
    </span>
  );
}

function getAiErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case 401:
        return '登录已失效，请重新登录后再试。';
      case 500:
        return error.error === 'AI_NOT_CONFIGURED' ? 'AI 功能尚未配置。' : error.message;
      case 502:
        return 'AI 服务暂时不可用，请稍后再试。';
      default:
        return error.message;
    }
  }

  return '解析失败，请稍后再试。';
}

export function AiPanel() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedCreates, setAppliedCreates] = useState<Set<number>>(new Set());
  const [appliedCompletes, setAppliedCompletes] = useState<Set<string>>(new Set());
  const [appliedDeletes, setAppliedDeletes] = useState<Set<string>>(new Set());

  const items = useListStore((state) => state.items);
  const beginHistoryBatch = useListStore((state) => state.beginHistoryBatch);
  const finishHistoryBatch = useListStore((state) => state.finishHistoryBatch);
  const createItem = useListStore((state) => state.createItem);
  const deleteItem = useListStore((state) => state.deleteItem);
  const toggleComplete = useListStore((state) => state.toggleComplete);

  const handleParse = async () => {
    if (!input.trim() || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setAppliedCreates(new Set());
    setAppliedCompletes(new Set());
    setAppliedDeletes(new Set());

    const currentItems = items
      .filter((item) => !item.isPending)
      .map((item) => ({
        id: item.id,
        text: item.text,
        dueDate: item.dueDate,
        startTime: item.startTime,
        endTime: item.endTime,
        category: item.category,
        completed: item.completed,
      }));

    try {
      const data = await api.post<AiParseResult>('/ai/parse', {
        input: input.trim(),
        currentItems,
      });

      const enrich = (list: AiParseActionItem[]): ActionPreviewItem[] =>
        list
          .map((entry) => {
            const match = items.find((item) => item.id === entry.id);
            if (!match) {
              return null;
            }

            return {
              id: entry.id,
              text: match.text,
              dueDate: match.dueDate,
            };
          })
          .filter((entry): entry is ActionPreviewItem => entry != null);

      setResult({
        creates: data.creates,
        completes: enrich(data.completes ?? []),
        deletes: enrich(data.deletes ?? []),
      });
    } catch (nextError) {
      setError(getAiErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCreate = async (item: AiParseCreateItem, index: number) => {
    await createItem({
      text: item.text,
      dueDate: item.dueDate,
      startTime: item.startTime,
      endTime: item.endTime,
      category: item.category,
      type: item.type,
    });
    setAppliedCreates((previous) => new Set(previous).add(index));
  };

  const handleApplyComplete = async (item: ActionPreviewItem) => {
    const storeItem = items.find((entry) => entry.id === item.id);
    if (!storeItem || storeItem.completed) {
      return;
    }

    await toggleComplete(storeItem.clientId);
    setAppliedCompletes((previous) => new Set(previous).add(item.id));
  };

  const handleApplyDelete = async (item: ActionPreviewItem) => {
    const storeItem = items.find((entry) => entry.id === item.id);
    if (!storeItem) {
      return;
    }

    await deleteItem(storeItem.clientId);
    setAppliedDeletes((previous) => new Set(previous).add(item.id));
  };

  const handleApplyAll = async () => {
    if (!result) {
      return;
    }

    beginHistoryBatch();
    try {
      for (let index = 0; index < result.creates.length; index += 1) {
        if (!appliedCreates.has(index)) {
          await handleApplyCreate(result.creates[index], index);
        }
      }

      for (const item of result.completes) {
        if (!appliedCompletes.has(item.id)) {
          await handleApplyComplete(item);
        }
      }

      for (const item of result.deletes) {
        if (!appliedDeletes.has(item.id)) {
          await handleApplyDelete(item);
        }
      }
    } catch (nextError) {
      setError(getAiErrorMessage(nextError));
    } finally {
      finishHistoryBatch();
    }
  };

  const handleClear = () => {
    setResult(null);
    setError(null);
    setAppliedCreates(new Set());
    setAppliedCompletes(new Set());
    setAppliedDeletes(new Set());
    setInput('');
  };

  const totalOps =
    (result?.creates.length ?? 0) +
    (result?.completes.length ?? 0) +
    (result?.deletes.length ?? 0);
  const appliedOps = appliedCreates.size + appliedCompletes.size + appliedDeletes.size;
  const allApplied = result !== null && totalOps > 0 && appliedOps === totalOps;

  const summaryParts: string[] = [];
  if (result) {
    if (result.creates.length > 0) summaryParts.push(`新建 ${result.creates.length} 条`);
    if (result.completes.length > 0) summaryParts.push(`完成 ${result.completes.length} 条`);
    if (result.deletes.length > 0) summaryParts.push(`删除 ${result.deletes.length} 条`);
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="section-kicker">AI 解析</p>
        {result && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-[10px] transition hover:opacity-70"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={10} />
            清除
          </button>
        )}
      </div>

      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={'用自然语言描述你的计划\n例如：把今天的任务标记完成，删掉明天的会议，新增周五下午的复盘'}
        className="resize-none rounded-xl border bg-transparent p-3 text-sm leading-relaxed outline-none placeholder:opacity-40 transition"
        style={{
          color: 'var(--color-text)',
          borderColor: 'var(--color-border)',
          fontFamily: 'var(--font-body)',
          minHeight: '110px',
        }}
        onFocus={(event) => {
          event.target.style.borderColor = 'var(--color-primary)';
        }}
        onBlur={(event) => {
          event.target.style.borderColor = 'var(--color-border)';
        }}
      />

      <button
        type="button"
        onClick={() => void handleParse()}
        disabled={!input.trim() || loading}
        className="flex items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition"
        style={{
          backgroundColor: input.trim() && !loading ? 'var(--color-primary)' : 'var(--color-border)',
          color: input.trim() && !loading ? '#fff' : 'var(--color-text-muted)',
          cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? '解析中...' : 'AI 解析'}
      </button>

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      {result && totalOps > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {summaryParts.join('，')}
            </p>
            {!allApplied && (
              <button
                type="button"
                onClick={() => void handleApplyAll()}
                className="text-xs transition hover:opacity-70"
                style={{ color: 'var(--color-primary)' }}
              >
                全部执行
              </button>
            )}
          </div>

          {result.creates.map((item, index) => {
            const applied = appliedCreates.has(index);
            const categoryStyle = item.category ? CATEGORY_COLORS[item.category] : null;
            return (
              <div
                key={`create-${index}`}
                className="flex items-start gap-2 rounded-xl border p-2.5 transition"
                style={{
                  borderColor: applied ? 'var(--color-success)' : 'var(--color-border)',
                  backgroundColor: applied
                    ? 'color-mix(in srgb, var(--color-success) 6%, transparent)'
                    : 'color-mix(in srgb, var(--color-card) 80%, transparent)',
                  opacity: applied ? 0.55 : 1,
                }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs leading-relaxed"
                    style={{
                      color: 'var(--color-text)',
                      fontWeight: item.type === 'heading' ? 600 : 400,
                    }}
                  >
                    {item.text}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.category && categoryStyle && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{ backgroundColor: categoryStyle.bg, color: categoryStyle.color }}
                      >
                        {item.category}
                      </span>
                    )}
                    {item.dueDate && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {item.dueDate}
                      </span>
                    )}
                    <TimeBadge startTime={item.startTime} endTime={item.endTime} />
                  </div>
                </div>
                {applied ? (
                  <Check size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleApplyCreate(item, index)}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition hover:opacity-70"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-muted)',
                    }}
                    title="添加此条"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {result.completes.map((item) => {
            const applied = appliedCompletes.has(item.id);
            return (
              <div
                key={`complete-${item.id}`}
                className="flex items-start gap-2 rounded-xl border p-2.5 transition"
                style={{
                  borderColor: applied
                    ? 'var(--color-success)'
                    : 'color-mix(in srgb, var(--color-success) 40%, var(--color-border))',
                  backgroundColor: applied
                    ? 'color-mix(in srgb, var(--color-success) 10%, transparent)'
                    : 'color-mix(in srgb, var(--color-success) 5%, transparent)',
                  opacity: applied ? 0.55 : 1,
                }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs leading-relaxed"
                    style={{
                      color: 'var(--color-success)',
                      textDecoration: applied ? 'line-through' : 'none',
                    }}
                  >
                    {item.text}
                  </p>
                  {item.dueDate && (
                    <div className="mt-1">
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-success) 8%, transparent)',
                          color: 'var(--color-success)',
                        }}
                      >
                        {item.dueDate}
                      </span>
                    </div>
                  )}
                </div>
                {applied ? (
                  <Check size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleApplyComplete(item)}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition hover:opacity-70"
                    style={{
                      borderColor:
                        'color-mix(in srgb, var(--color-success) 40%, var(--color-border))',
                      color: 'var(--color-success)',
                    }}
                    title="标记完成"
                  >
                    <CheckCircle2 size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {result.deletes.map((item) => {
            const applied = appliedDeletes.has(item.id);
            return (
              <div
                key={`delete-${item.id}`}
                className="flex items-start gap-2 rounded-xl border p-2.5 transition"
                style={{
                  borderColor: applied
                    ? 'var(--color-success)'
                    : 'color-mix(in srgb, var(--color-danger) 40%, var(--color-border))',
                  backgroundColor: applied
                    ? 'color-mix(in srgb, var(--color-success) 6%, transparent)'
                    : 'color-mix(in srgb, var(--color-danger) 5%, transparent)',
                  opacity: applied ? 0.55 : 1,
                }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs leading-relaxed"
                    style={{
                      color: 'var(--color-danger)',
                      textDecoration: applied ? 'line-through' : 'none',
                    }}
                  >
                    {item.text}
                  </p>
                  {item.dueDate && (
                    <div className="mt-1">
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-danger) 8%, transparent)',
                          color: 'var(--color-danger)',
                        }}
                      >
                        {item.dueDate}
                      </span>
                    </div>
                  )}
                </div>
                {applied ? (
                  <Check size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleApplyDelete(item)}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition hover:opacity-70"
                    style={{
                      borderColor:
                        'color-mix(in srgb, var(--color-danger) 40%, var(--color-border))',
                      color: 'var(--color-danger)',
                    }}
                    title="删除此条"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {result && totalOps === 0 && (
        <p className="text-xs muted-copy">没有识别到可执行操作，试着描述得更具体一点。</p>
      )}
    </div>
  );
}
