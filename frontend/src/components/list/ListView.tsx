import { useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Trash2, X } from 'lucide-react';
import type { ListEntry } from '../../lib/listModels';
import { useListStore } from '../../stores/listStore';
import { ListItem } from './ListItem';

export function ListView() {
  const items = useListStore((state) => state.items);
  const isLoading = useListStore((state) => state.isLoading);
  const focusTargetId = useListStore((state) => state.focusTargetId);
  const clearFocusTarget = useListStore((state) => state.clearFocusTarget);
  const createItem = useListStore((state) => state.createItem);
  const updateText = useListStore((state) => state.updateText);
  const flushTextSave = useListStore((state) => state.flushTextSave);
  const toggleComplete = useListStore((state) => state.toggleComplete);
  const changeLevel = useListStore((state) => state.changeLevel);
  const deleteItem = useListStore((state) => state.deleteItem);
  const reorderItems = useListStore((state) => state.reorderItems);
  const convertToHeading = useListStore((state) => state.convertToHeading);
  const toggleHeading = useListStore((state) => state.toggleHeading);
  // S4: search
  const searchQuery = useListStore((state) => state.searchQuery);
  // S4: bulk selection
  const selectionMode = useListStore((state) => state.selectionMode);
  const selectedIds = useListStore((state) => state.selectedIds);
  const toggleSelectionMode = useListStore((state) => state.toggleSelectionMode);
  const toggleItemSelection = useListStore((state) => state.toggleItemSelection);
  const clearSelection = useListStore((state) => state.clearSelection);
  const deleteSelected = useListStore((state) => state.deleteSelected);

  const refs = useRef(new Map<string, HTMLTextAreaElement | null>());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Filter items by search query (case-insensitive)
  const displayedItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.text.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const sortableIds = useMemo(() => displayedItems.map((item) => item.clientId), [displayedItems]);

  useEffect(() => {
    if (!focusTargetId) return;
    const element = refs.current.get(focusTargetId);
    if (!element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
    clearFocusTarget();
  }, [clearFocusTarget, focusTargetId, items]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-[1.35rem] border"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'color-mix(in srgb, var(--color-input-bg) 74%, transparent)',
            }}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex min-h-[14rem] flex-col justify-between rounded-[1.8rem] border px-6 py-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="space-y-3">
          <p className="section-kicker">随时可以开始</p>
          <h3 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            写下第一行。
          </h3>
          <p className="max-w-lg text-sm leading-7 muted-copy">
            回车新建、Tab 缩进、Shift+Tab 提升层级、Backspace 删除空行、拖拽排序。
          </p>
        </div>

        <button type="button" className="ink-button w-fit" onClick={() => void createItem({})}>
          新建第一条
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selection / bulk action toolbar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggleSelectionMode}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs tracking-[0.14em] uppercase transition"
          style={{
            borderColor: selectionMode ? 'var(--color-primary)' : 'var(--color-border)',
            color: selectionMode ? 'var(--color-primary)' : 'var(--color-text-muted)',
            backgroundColor: selectionMode
              ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
              : 'transparent',
          }}
        >
          <CheckSquare size={12} />
          {selectionMode ? '选择中' : '多选'}
        </button>

        <AnimatePresence>
          {selectionMode && selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => void deleteSelected()}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs tracking-[0.14em] uppercase transition"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-danger) 50%, var(--color-border))',
                  color: 'var(--color-danger)',
                }}
              >
                <Trash2 size={12} />
                删除 {selectedIds.size} 条
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                aria-label="取消选择"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search result count */}
        {searchQuery && (
          <span className="text-xs muted-copy ml-auto">
            {displayedItems.length} / {items.length} 条
          </span>
        )}
      </div>

      {/* Empty search result */}
      {searchQuery && displayedItems.length === 0 && (
        <p className="py-8 text-center text-sm muted-copy">没有匹配「{searchQuery}」的条目</p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return;
          void reorderItems(String(active.id), String(over.id));
        }}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <motion.ol layout className="space-y-3">
            {displayedItems.map((item) => (
              <ListItem
                key={item.clientId}
                item={item}
                isFocused={focusTargetId === item.clientId}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(item.clientId)}
                onTextChange={(clientId, text) => updateText(clientId, text)}
                onTextCommit={(clientId) => void flushTextSave(clientId)}
                onToggleComplete={(clientId) => void toggleComplete(clientId)}
                onCreateBelow={(currentItem: ListEntry) =>
                  void createItem({
                    afterClientId: currentItem.clientId,
                    level: currentItem.type === 'heading' ? currentItem.level + 1 : currentItem.level,
                  })
                }
                onIndent={(clientId) => void changeLevel(clientId, 1)}
                onOutdent={(clientId) => void changeLevel(clientId, -1)}
                onDeleteEmpty={(clientId) => void deleteItem(clientId)}
                onHeadingCommand={(clientId) => void convertToHeading(clientId)}
                onToggleHeading={(clientId) => void toggleHeading(clientId)}
                onRegisterFocusTarget={(clientId, element) => {
                  refs.current.set(clientId, element);
                }}
                onToggleSelect={(clientId) => toggleItemSelection(clientId)}
              />
            ))}
          </motion.ol>
        </SortableContext>

      </DndContext>
    </div>
  );
}
