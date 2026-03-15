import { arrayMove } from '@dnd-kit/sortable';
import type { ItemType, ListItem } from '../sharedTypes';

export interface ListEntry extends ListItem {
  clientId: string;
  isPending: boolean;
  isSaving: boolean;
  syncError: boolean;
}

function createClientId() {
  return `client-${crypto.randomUUID()}`;
}

export function toListEntry(item: ListItem): ListEntry {
  return {
    ...item,
    clientId: item.id,
    isPending: false,
    isSaving: false,
    syncError: false,
  };
}

export function createOptimisticEntry(input: {
  userId: string;
  orderIndex: number;
  level: number;
  type: ItemType;
  text?: string;
  dueDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  category?: import('../sharedTypes').ItemCategory | null;
}): ListEntry {
  const now = Date.now();
  const tempId = `temp-${crypto.randomUUID()}`;

  return {
    id: tempId,
    clientId: createClientId(),
    userId: input.userId,
    text: input.text ?? '',
    completed: false,
    level: clampLevel(input.level),
    type: input.type,
    orderIndex: input.orderIndex,
    dueDate: input.dueDate ?? null,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    category: input.category ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isPending: true,
    isSaving: false,
    syncError: false,
  };
}

export function clampLevel(level: number) {
  return Math.min(4, Math.max(0, level));
}

export function sortEntries(items: ListEntry[]) {
  return [...items].sort((left, right) => left.orderIndex - right.orderIndex);
}

// Sort for display: incomplete items first (by orderIndex), completed items last (by orderIndex).
// Framer Motion layout animation will animate items moving when completion status changes.
export function sortEntriesForDisplay(items: ListEntry[]) {
  const byIndex = (a: ListEntry, b: ListEntry) => a.orderIndex - b.orderIndex;
  const incomplete = items.filter((item) => !item.completed).sort(byIndex);
  const complete = items.filter((item) => item.completed).sort(byIndex);
  return [...incomplete, ...complete];
}

export function computeInsertedOrderIndex(items: ListEntry[], afterClientId?: string) {
  const sortedItems = sortEntries(items);

  if (!afterClientId) {
    const lastItem = sortedItems.at(-1);
    return lastItem ? lastItem.orderIndex + 1 : 0;
  }

  const currentIndex = sortedItems.findIndex((item) => item.clientId === afterClientId);
  if (currentIndex === -1) {
    const lastItem = sortedItems.at(-1);
    return lastItem ? lastItem.orderIndex + 1 : 0;
  }

  const currentItem = sortedItems[currentIndex];
  const nextItem = sortedItems[currentIndex + 1];
  return nextItem ? (currentItem.orderIndex + nextItem.orderIndex) / 2 : currentItem.orderIndex + 1;
}

export function replaceEntry(
  items: ListEntry[],
  clientId: string,
  recipe: (item: ListEntry) => ListEntry,
) {
  return items.map((item) => (item.clientId === clientId ? recipe(item) : item));
}

export function removeEntry(items: ListEntry[], clientId: string) {
  return items.filter((item) => item.clientId !== clientId);
}

export function computeFocusAfterDelete(items: ListEntry[], clientId: string) {
  const index = items.findIndex((item) => item.clientId === clientId);
  if (index <= 0) {
    return items[1]?.clientId ?? null;
  }

  return items[index - 1]?.clientId ?? null;
}

export function getPersistedAfterId(items: ListEntry[], clientId?: string) {
  if (!clientId) {
    const lastPersisted = [...items].reverse().find((item) => !item.isPending);
    return lastPersisted?.id;
  }

  const sortedItems = sortEntries(items);
  const index = sortedItems.findIndex((item) => item.clientId === clientId);

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = sortedItems[cursor];
    if (!candidate.isPending) {
      return candidate.id;
    }
  }

  return undefined;
}

export function reorderEntries(items: ListEntry[], activeClientId: string, overClientId: string) {
  const activeIndex = items.findIndex((item) => item.clientId === activeClientId);
  const overIndex = items.findIndex((item) => item.clientId === overClientId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return items;
  }

  return arrayMove(items, activeIndex, overIndex).map((item, index) => ({
    ...item,
    orderIndex: index,
  }));
}
