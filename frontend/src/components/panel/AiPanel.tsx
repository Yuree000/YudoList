import { useState } from 'react';
import { Sparkles, Plus, Trash2, Loader2, X, Check, CheckCircle2 } from 'lucide-react';
import { useListStore } from '../../stores/listStore';
import type { ItemCategory } from '../../sharedTypes';

interface CreateItem {
  text: string;
  dueDate: string | null;
  startTime: string | null;
  endTime: string | null;
  category: ItemCategory | null;
  type: 'task' | 'heading';
}

interface ActionItem {
  id: string;
  text?: string;
  dueDate?: string | null;
}

interface ParseResult {
  creates: CreateItem[];
  completes: ActionItem[];
  deletes: ActionItem[];
}

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  学习: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  生活: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  工作: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

function TimeBadge({ startTime, endTime }: { startTime: string | null; endTime: string | null }) {
  if (!startTime && !endTime) return null;
  const label = startTime && endTime
    ? `${startTime}–${endTime}`
    : startTime ? `${startTime} 开始` : `${endTime} 前`;
  return (
    <span className="rounded-full px-1.5 py-0.5 text-[10px]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)', color: 'var(--color-text-muted)' }}>
      {label}
    </span>
  );
}

export function AiPanel() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedCreates, setAppliedCreates] = useState<Set<number>>(new Set());
  const [appliedCompletes, setAppliedCompletes] = useState<Set<string>>(new Set());
  const [appliedDeletes, setAppliedDeletes] = useState<Set<string>>(new Set());

  const items = useListStore((state) => state.items);
  const createItem = useListStore((state) => state.createItem);
  const toggleComplete = useListStore((state) => state.toggleComplete);
  const deleteItem = useListStore((state) => state.deleteItem);

  const handleParse = async () => {
    if (!input.trim() || loading) return;
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
      const res = await fetch('/api/v1/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), currentItems }),
      });
      if (!res.ok) throw new Error('解析失败，请稍后重试');

      const data = (await res.json()) as ParseResult;

      const enrich = (list: ActionItem[]) =>
        list.map((d) => {
          const match = items.find((item) => item.id === d.id);
          return { id: d.id, text: match?.text ?? '(未知任务)', dueDate: match?.dueDate ?? null };
        });

      setResult({
        creates: data.creates,
        completes: enrich(data.completes ?? []),
        deletes: enrich(data.deletes ?? []),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCreate = async (item: CreateItem, idx: number) => {
    await createItem({
      text: item.text,
      dueDate: item.dueDate,
      startTime: item.startTime,
      endTime: item.endTime,
      category: item.category,
      type: item.type,
    });
    setAppliedCreates((prev) => new Set(prev).add(idx));
  };

  const handleApplyComplete = async (d: ActionItem) => {
    const storeItem = items.find((item) => item.id === d.id);
    if (!storeItem || storeItem.completed) return; // already done, skip
    await toggleComplete(storeItem.clientId);
    setAppliedCompletes((prev) => new Set(prev).add(d.id));
  };

  const handleApplyDelete = async (d: ActionItem) => {
    const storeItem = items.find((item) => item.id === d.id);
    if (!storeItem) return;
    await deleteItem(storeItem.clientId);
    setAppliedDeletes((prev) => new Set(prev).add(d.id));
  };

  const handleApplyAll = async () => {
    if (!result) return;
    for (let i = 0; i < result.creates.length; i++) {
      if (!appliedCreates.has(i)) await handleApplyCreate(result.creates[i], i);
    }
    for (const d of result.completes) {
      if (!appliedCompletes.has(d.id)) await handleApplyComplete(d);
    }
    for (const d of result.deletes) {
      if (!appliedDeletes.has(d.id)) await handleApplyDelete(d);
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

  const totalOps = (result?.creates.length ?? 0) + (result?.completes.length ?? 0) + (result?.deletes.length ?? 0);
  const appliedOps = appliedCreates.size + appliedCompletes.size + appliedDeletes.size;
  const allApplied = result !== null && totalOps > 0 && appliedOps === totalOps;

  // Summary text
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
          <button type="button" onClick={handleClear}
            className="flex items-center gap-1 text-[10px] transition hover:opacity-70"
            style={{ color: 'var(--color-text-muted)' }}>
            <X size={10} />清除
          </button>
        )}
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={'用自然语言描述你的计划…\n例如：3.16的任务都完成了，删掉明天的会议'}
        className="resize-none rounded-xl border bg-transparent p-3 text-sm leading-relaxed outline-none placeholder:opacity-40 transition"
        style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)', fontFamily: 'var(--font-body)', minHeight: '110px' }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
      />

      <button type="button" onClick={() => void handleParse()} disabled={!input.trim() || loading}
        className="flex items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition"
        style={{
          backgroundColor: input.trim() && !loading ? 'var(--color-primary)' : 'var(--color-border)',
          color: input.trim() && !loading ? '#fff' : 'var(--color-text-muted)',
          cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
        }}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? '解析中…' : 'AI 解析'}
      </button>

      {error && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {result && totalOps > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{summaryParts.join('，')}</p>
            {!allApplied && (
              <button type="button" onClick={() => void handleApplyAll()}
                className="text-xs transition hover:opacity-70" style={{ color: 'var(--color-primary)' }}>
                全部执行
              </button>
            )}
          </div>

          {/* Creates — blue left border */}
          {result.creates.map((item, idx) => {
            const applied = appliedCreates.has(idx);
            const cat = item.category ? CATEGORY_COLORS[item.category] : null;
            return (
              <div key={`c-${idx}`} className="flex items-start gap-2 rounded-xl border p-2.5 transition"
                style={{
                  borderColor: applied ? 'var(--color-success)' : 'var(--color-border)',
                  backgroundColor: applied
                    ? 'color-mix(in srgb, var(--color-success) 6%, transparent)'
                    : 'color-mix(in srgb, var(--color-card) 80%, transparent)',
                  opacity: applied ? 0.55 : 1,
                }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)', fontWeight: item.type === 'heading' ? 600 : 400 }}>
                    {item.text}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.category && cat && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: cat.bg, color: cat.color }}>{item.category}</span>
                    )}
                    {item.dueDate && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)', color: 'var(--color-primary)' }}>
                        {item.dueDate}
                      </span>
                    )}
                    <TimeBadge startTime={item.startTime} endTime={item.endTime} />
                  </div>
                </div>
                {applied
                  ? <Check size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                  : <button type="button" onClick={() => void handleApplyCreate(item, idx)}
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition hover:opacity-70"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }} title="添加此条">
                      <Plus size={12} />
                    </button>}
              </div>
            );
          })}

          {/* Completes — green tint */}
          {result.completes.map((d) => {
            const applied = appliedCompletes.has(d.id);
            return (
              <div key={`done-${d.id}`} className="flex items-start gap-2 rounded-xl border p-2.5 transition"
                style={{
                  borderColor: applied ? 'var(--color-success)' : 'color-mix(in srgb, var(--color-success) 40%, var(--color-border))',
                  backgroundColor: applied
                    ? 'color-mix(in srgb, var(--color-success) 10%, transparent)'
                    : 'color-mix(in srgb, var(--color-success) 5%, transparent)',
                  opacity: applied ? 0.55 : 1,
                }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed"
                    style={{ color: 'var(--color-success)', textDecoration: applied ? 'line-through' : 'none' }}>
                    {d.text}
                  </p>
                  {d.dueDate && (
                    <div className="mt-1">
                      <span className="rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 8%, transparent)', color: 'var(--color-success)' }}>
                        {d.dueDate}
                      </span>
                    </div>
                  )}
                </div>
                {applied
                  ? <Check size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                  : <button type="button" onClick={() => void handleApplyComplete(d)}
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition hover:opacity-70"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-success) 40%, var(--color-border))', color: 'var(--color-success)' }}
                      title="标记完成">
                      <CheckCircle2 size={12} />
                    </button>}
              </div>
            );
          })}

          {/* Deletes — red tint */}
          {result.deletes.map((d) => {
            const applied = appliedDeletes.has(d.id);
            return (
              <div key={`del-${d.id}`} className="flex items-start gap-2 rounded-xl border p-2.5 transition"
                style={{
                  borderColor: applied ? 'var(--color-success)' : 'color-mix(in srgb, var(--color-danger) 40%, var(--color-border))',
                  backgroundColor: applied
                    ? 'color-mix(in srgb, var(--color-success) 6%, transparent)'
                    : 'color-mix(in srgb, var(--color-danger) 5%, transparent)',
                  opacity: applied ? 0.55 : 1,
                }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed"
                    style={{ color: 'var(--color-danger)', textDecoration: applied ? 'line-through' : 'none' }}>
                    {d.text}
                  </p>
                  {d.dueDate && (
                    <div className="mt-1">
                      <span className="rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', color: 'var(--color-danger)' }}>
                        {d.dueDate}
                      </span>
                    </div>
                  )}
                </div>
                {applied
                  ? <Check size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                  : <button type="button" onClick={() => void handleApplyDelete(d)}
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition hover:opacity-70"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-danger) 40%, var(--color-border))', color: 'var(--color-danger)' }}
                      title="删除此条">
                      <Trash2 size={12} />
                    </button>}
              </div>
            );
          })}
        </div>
      )}

      {result && totalOps === 0 && (
        <p className="text-xs muted-copy">没有识别到操作，试着描述得更具体一些</p>
      )}
    </div>
  );
}
