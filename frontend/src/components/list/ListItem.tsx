import { useEffect, useRef, useState } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Check, GripVertical, CalendarClock, X, Heading } from 'lucide-react';
import { motion } from 'framer-motion';
import { useKeyboard } from '../../hooks/useKeyboard';
import type { ListEntry } from '../../lib/listModels';
import type { ItemCategory } from '../../sharedTypes';
import { useListStore } from '../../stores/listStore';

// Category config
const CATEGORIES: { value: ItemCategory; label: string; color: string; bg: string }[] = [
  { value: '学习', label: '学习', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { value: '生活', label: '生活', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '工作', label: '工作', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
];

function nextCategory(current: ItemCategory | null): ItemCategory | null {
  if (current === null) return '学习';
  if (current === '学习') return '生活';
  if (current === '生活') return '工作';
  return null;
}

function formatDeadline(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

interface ListItemProps {
  item: ListEntry;
  isFocused: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  onTextChange: (clientId: string, text: string) => void;
  onTextCommit: (clientId: string) => void;
  onToggleComplete: (clientId: string) => void;
  onCreateBelow: (item: ListEntry) => void;
  onIndent: (clientId: string) => void;
  onOutdent: (clientId: string) => void;
  onDeleteEmpty: (clientId: string) => void;
  onHeadingCommand: (clientId: string) => void;
  onToggleHeading: (clientId: string) => void;
  onRegisterFocusTarget: (clientId: string, element: HTMLTextAreaElement | null) => void;
  onToggleSelect: (clientId: string) => void;
}

export function ListItem({
  item,
  isFocused,
  selectionMode,
  isSelected,
  onTextChange,
  onTextCommit,
  onToggleComplete,
  onCreateBelow,
  onIndent,
  onOutdent,
  onDeleteEmpty,
  onHeadingCommand,
  onToggleHeading,
  onRegisterFocusTarget,
  onToggleSelect,
}: ListItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const setCategory = useListStore((state) => state.setCategory);
  const setItemDueDate = useListStore((state) => state.setItemDueDate);

  const [editingDate, setEditingDate] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.clientId });

  const handleKeyDown = useKeyboard({
    item,
    onCreateBelow: () => onCreateBelow(item),
    onIndent: () => onIndent(item.clientId),
    onOutdent: () => onOutdent(item.clientId),
    onDeleteEmpty: () => onDeleteEmpty(item.clientId),
    onHeadingCommand: () => onHeadingCommand(item.clientId),
  });

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.max(element.scrollHeight, 32)}px`;
  }, [item.text, item.type]);

  useEffect(() => {
    onRegisterFocusTarget(item.clientId, textareaRef.current);
  }, [item.clientId, onRegisterFocusTarget]);

  useEffect(() => {
    if (!isFocused || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(item.text.length, item.text.length);
  }, [isFocused, item.text.length]);

  const categoryConfig = item.category ? CATEGORIES.find((c) => c.value === item.category) : null;

  return (
    <motion.li
      ref={setNodeRef}
      layout
      className="list-none"
      style={{
        // Restrict drag to vertical axis by zeroing out x
        transform: transform ? CSS.Transform.toString({ ...transform, x: 0 }) : undefined,
        transition,
      }}
    >
      <div
        className="group relative rounded-[1.6rem] border px-3 py-3 transition"
        style={{
          borderStyle: isDragging ? 'dashed' : 'solid',
          borderColor: isDragging
            ? 'var(--color-border)'
            : item.syncError
              ? 'color-mix(in srgb, var(--color-danger) 44%, var(--color-border))'
              : isSelected
                ? 'color-mix(in srgb, var(--color-primary) 60%, var(--color-border))'
                : 'var(--color-border)',
          backgroundColor: isDragging
            ? 'transparent'
            : isSelected
              ? 'color-mix(in srgb, var(--color-card) 80%, var(--color-primary) 8%)'
              : 'color-mix(in srgb, var(--color-card) 94%, transparent)',
          opacity: isDragging ? 0.4 : 1,
          boxShadow:
            isFocused && !isDragging
              ? '0 0 0 4px color-mix(in srgb, var(--color-primary) 12%, transparent)'
              : 'none',
          marginLeft: `${item.level * 1.05}rem`,
        }}
      >
        <div className="flex items-start gap-2">
          {/* Selection checkbox or completion toggle */}
          {selectionMode ? (
            <button
              type="button"
              onClick={() => onToggleSelect(item.clientId)}
              className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition"
              style={{
                borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
              }}
              aria-label={isSelected ? '取消选中' : '选中'}
            >
              {isSelected && <Check size={13} color="#fff" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleComplete(item.clientId)}
              className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition"
              style={{
                borderColor: item.completed ? 'var(--color-success)' : 'var(--color-border)',
                backgroundColor: item.completed
                  ? 'color-mix(in srgb, var(--color-success) 18%, transparent)'
                  : 'transparent',
              }}
              aria-label={item.completed ? '标记为未完成' : '标记为已完成'}
            >
              <span
                className="h-2.5 w-2.5 rounded-full transition"
                style={{
                  backgroundColor: item.completed ? 'var(--color-success)' : 'transparent',
                }}
              />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={item.text}
              rows={1}
              spellCheck={false}
              placeholder={item.type === 'heading' ? '输入标题' : '写下一行'}
              className="w-full resize-none overflow-hidden bg-transparent pr-2 outline-none"
              style={{
                fontFamily: item.type === 'heading' ? 'var(--font-display)' : 'var(--font-body)',
                fontSize: item.type === 'heading' ? '1.4rem' : '1.05rem',
                fontWeight: item.type === 'heading' ? 600 : 400,
                lineHeight: item.type === 'heading' ? '1.9rem' : '1.65rem',
                textDecoration: item.completed ? 'line-through' : 'none',
                opacity: item.completed ? 0.5 : 1,
                color: item.syncError ? 'var(--color-danger)' : 'var(--color-text)',
              }}
              onChange={(event) => onTextChange(item.clientId, event.target.value)}
              onBlur={() => onTextCommit(item.clientId)}
              onKeyDown={handleKeyDown}
            />

            {/* Metadata row: category + deadline */}
            {item.type !== 'heading' && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                style={{ opacity: (item.category || item.dueDate) ? 1 : undefined }}>

                {/* Category badge — click to cycle */}
                <button
                  type="button"
                  onClick={() => void setCategory(item.clientId, nextCategory(item.category))}
                  className="flex items-center rounded-full px-2 py-0.5 text-xs transition hover:opacity-80"
                  style={
                    categoryConfig
                      ? { backgroundColor: categoryConfig.bg, color: categoryConfig.color, border: `1px solid ${categoryConfig.color}30` }
                      : { backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)' }
                  }
                  title="点击切换标签"
                >
                  {categoryConfig ? categoryConfig.label : '+ 标签'}
                </button>

                {/* Time badge */}
                {(item.startTime || item.endTime) && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)',
                      color: 'var(--color-text-muted)',
                      border: '1px solid color-mix(in srgb, var(--color-text-muted) 20%, transparent)',
                    }}
                  >
                    {item.startTime && item.endTime
                      ? `${item.startTime}–${item.endTime}`
                      : item.startTime
                        ? `${item.startTime} 开始`
                        : `${item.endTime} 前`}
                  </span>
                )}

                {/* Deadline badge */}
                {item.dueDate ? (
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                      color: 'var(--color-primary)',
                      border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
                    }}
                  >
                    <CalendarClock size={11} />
                    {formatDeadline(item.dueDate)}
                    <button
                      type="button"
                      onClick={() => void setItemDueDate(item.clientId, null)}
                      aria-label="清除截止日期"
                      className="ml-0.5 hover:opacity-70"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ) : (
                  !editingDate && (
                    <button
                      type="button"
                      onClick={() => setEditingDate(true)}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition hover:opacity-70"
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-muted)',
                        border: '1px dashed var(--color-border)',
                      }}
                    >
                      <CalendarClock size={11} />
                      截止日期
                    </button>
                  )
                )}

                {editingDate && (
                  <input
                    type="date"
                    autoFocus
                    className="rounded-full border px-2 py-0.5 text-xs outline-none"
                    style={{
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-text)',
                      backgroundColor: 'var(--color-bg)',
                    }}
                    defaultValue={item.dueDate ?? ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        void setItemDueDate(item.clientId, e.target.value);
                      }
                      setEditingDate(false);
                    }}
                    onBlur={() => setEditingDate(false)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Heading toggle */}
          <button
            type="button"
            onClick={() => onToggleHeading(item.clientId)}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border opacity-0 transition group-hover:opacity-60 hover:opacity-100"
            style={{
              borderColor: item.type === 'heading' ? 'var(--color-primary)' : 'var(--color-border)',
              color: item.type === 'heading' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
            aria-label={item.type === 'heading' ? '转为任务' : '转为标题'}
            title={item.type === 'heading' ? '转为任务' : '转为标题'}
          >
            <Heading size={14} />
          </button>

          {/* Drag handle */}
          <button
            type="button"
            className="mt-1 flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-full border opacity-0 transition group-hover:opacity-60 active:cursor-grabbing active:opacity-100"
            style={{ borderColor: 'var(--color-border)' }}
            aria-label="拖拽排序"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
        </div>
      </div>
    </motion.li>
  );
}
