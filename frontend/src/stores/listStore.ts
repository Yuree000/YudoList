import { create } from 'zustand';
import { api } from '../lib/api';
import {
  clampLevel,
  computeFocusAfterDelete,
  computeInsertedOrderIndex,
  createOptimisticEntry,
  getPersistedAfterId,
  removeEntry,
  reorderEntries,
  replaceEntry,
  sortEntries,
  sortEntriesForDisplay,
  toListEntry,
  type ListEntry,
} from '../lib/listModels';
import type { ItemCategory, ItemType, ListItem, ReorderPayload } from '../sharedTypes';
import { useAuthStore } from './authStore';
import { createListStoreHelpers } from './listStore.helpers';
import type { CreateItemOptions, ListState, UndoableCommand } from './listStore.types';

export const useListStore = create<ListState>((set, get) => ({
  ...(() => {
    const helpers = createListStoreHelpers(
      set as Parameters<typeof createListStoreHelpers>[0],
      get as Parameters<typeof createListStoreHelpers>[1],
    );

    // Track the text of each item at the start of an edit session (for undo)
    const originalTextMap = new Map<string, string>();

    // Guard to prevent recursive history recording during undo/redo
    let isApplyingHistory = false;

    function pushCommand(cmd: UndoableCommand) {
      if (isApplyingHistory) return;
      set((state) => ({
        undoStack: [...state.undoStack.slice(-49), cmd],
        redoStack: [],
      }));
    }

    async function withoutHistory(fn: () => Promise<void>) {
      isApplyingHistory = true;
      try {
        await fn();
      } finally {
        isApplyingHistory = false;
      }
    }

    return {
      items: [] as ListEntry[],
      isLoading: false,
      focusTargetId: null as string | null,
      searchQuery: '',
      selectionMode: false,
      selectedIds: new Set<string>(),
      undoStack: [] as UndoableCommand[],
      redoStack: [] as UndoableCommand[],
      selectedDate: null as string | null,

      async loadItems() {
        set({ isLoading: true });
        try {
          const { selectedDate } = get();
          const url = selectedDate ? `/items?date=${selectedDate}` : '/items';
          const items = (await api.get<ListItem[]>(url)).map(toListEntry);
          set({ items: sortEntriesForDisplay(items) });
          return items;
        } finally {
          set({ isLoading: false });
        }
      },

      async createItem(options: CreateItemOptions) {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) {
          throw new Error('Cannot create item without an authenticated user');
        }

        // Inherit the currently selected date if not explicitly provided
        const dueDate = options.dueDate !== undefined ? options.dueDate : get().selectedDate;

        const optimisticItem = createOptimisticEntry({
          userId,
          orderIndex: computeInsertedOrderIndex(get().items, options.afterClientId),
          level: clampLevel(options.level ?? 0),
          type: options.type ?? 'task',
          text: options.text,
          dueDate,
          startTime: options.startTime ?? null,
          endTime: options.endTime ?? null,
          category: options.category ?? null,
        });

        set((state) => ({
          items: sortEntriesForDisplay([...state.items, optimisticItem]),
          focusTargetId: optimisticItem.clientId,
        }));

        void helpers.persistCreate(
          optimisticItem.clientId,
          getPersistedAfterId(get().items, optimisticItem.clientId),
        );
        return optimisticItem.clientId;
      },

      updateText(clientId: string, text: string) {
        // Record original text at the start of an edit session for undo
        if (!originalTextMap.has(clientId)) {
          const current = get().items.find((e) => e.clientId === clientId);
          if (current) originalTextMap.set(clientId, current.text);
        }

        set((state) => ({
          items: replaceEntry(state.items, clientId, (item) => ({
            ...item,
            text,
            updatedAt: Date.now(),
            syncError: false,
          })),
        }));

        helpers.scheduleTextSave(clientId, () => {
          void get().flushTextSave(clientId);
        });
      },

      async flushTextSave(clientId: string) {
        helpers.clearTimer(clientId);
        const item = get().items.find((entry) => entry.clientId === clientId);
        if (!item) {
          originalTextMap.delete(clientId);
          return;
        }

        // Push undo command capturing the text change for this edit session
        const originalText = originalTextMap.get(clientId);
        originalTextMap.delete(clientId);
        if (originalText !== undefined && originalText !== item.text) {
          const savedText = item.text;
          pushCommand({
            async undo() {
              get().updateText(clientId, originalText);
              await get().flushTextSave(clientId);
            },
            async redo() {
              get().updateText(clientId, savedText);
              await get().flushTextSave(clientId);
            },
          });
        }

        if (item.isPending) {
          await helpers.persistCreate(clientId, getPersistedAfterId(get().items, clientId));
          return;
        }

        await helpers.commitUpdate(clientId, { text: item.text });
      },

      async toggleComplete(clientId: string) {
        const item = get().items.find((entry) => entry.clientId === clientId);
        if (!item) return;

        const completed = !item.completed;

        // Track daily activity in localStorage when completing an item
        if (completed) {
          const today = new Date().toISOString().slice(0, 10);
          const log: Record<string, number> = JSON.parse(
            localStorage.getItem('yudolist_activity') ?? '{}',
          );
          log[today] = (log[today] ?? 0) + 1;
          localStorage.setItem('yudolist_activity', JSON.stringify(log));
        }

        pushCommand({
          async undo() { await get().toggleComplete(clientId); },
          async redo() { await get().toggleComplete(clientId); },
        });

        set((state) => ({
          items: sortEntriesForDisplay(
            replaceEntry(state.items, clientId, (entry) => ({
              ...entry,
              completed,
              updatedAt: Date.now(),
              syncError: false,
            })),
          ),
        }));

        if (!item.isPending) {
          await helpers.commitUpdate(clientId, { completed });
        }
      },

      async changeLevel(clientId: string, delta: number) {
        const item = get().items.find((entry) => entry.clientId === clientId);
        if (!item) return;

        const nextLevel = clampLevel(item.level + delta);
        if (nextLevel === item.level) return;

        pushCommand({
          async undo() { await get().changeLevel(clientId, -delta); },
          async redo() { await get().changeLevel(clientId, delta); },
        });

        set((state) => ({
          items: replaceEntry(state.items, clientId, (entry) => ({
            ...entry,
            level: nextLevel,
            updatedAt: Date.now(),
            syncError: false,
          })),
        }));

        if (!item.isPending) {
          await helpers.commitUpdate(clientId, { level: nextLevel });
        }
      },

      async convertToHeading(clientId: string) {
        const item = get().items.find((entry) => entry.clientId === clientId);
        if (!item) return;

        const prevText = item.text;
        const prevType = item.type;

        pushCommand({
          async undo() {
            set((state) => ({
              items: replaceEntry(state.items, clientId, (entry) => ({
                ...entry,
                text: prevText,
                type: prevType as ItemType,
                updatedAt: Date.now(),
                syncError: false,
              })),
              focusTargetId: clientId,
            }));
            const restored = get().items.find((e) => e.clientId === clientId);
            if (restored && !restored.isPending) {
              await helpers.commitUpdate(clientId, { text: prevText, type: prevType as ItemType });
            }
          },
          async redo() { await get().convertToHeading(clientId); },
        });

        set((state) => ({
          items: replaceEntry(state.items, clientId, (entry) => ({
            ...entry,
            text: '',
            type: 'heading',
            updatedAt: Date.now(),
            syncError: false,
          })),
          focusTargetId: clientId,
        }));

        const updatedItem = get().items.find((entry) => entry.clientId === clientId);
        if (updatedItem && !updatedItem.isPending) {
          await helpers.commitUpdate(clientId, { text: '', type: 'heading' });
        }
      },

      async deleteItem(clientId: string) {
        helpers.clearTimer(clientId);
        originalTextMap.delete(clientId);
        const snapshot = get().items;
        const item = snapshot.find((entry) => entry.clientId === clientId);
        if (!item) return;

        // Find insertion position for undo (item before it in sorted order)
        const sortedSnapshot = sortEntries(snapshot);
        const sortedIdx = sortedSnapshot.findIndex((e) => e.clientId === clientId);
        const afterClientId = sortedIdx > 0 ? sortedSnapshot[sortedIdx - 1].clientId : undefined;

        // Mutable ref so undo can pass clientId to redo
        const restored = { newClientId: null as string | null };
        pushCommand({
          async undo() {
            const newId = await get().createItem({
              text: item.text,
              level: item.level,
              type: item.type,
              afterClientId,
            });
            restored.newClientId = newId;
          },
          async redo() {
            if (restored.newClientId) {
              await get().deleteItem(restored.newClientId);
            }
          },
        });

        set((state) => ({
          items: removeEntry(snapshot, clientId),
          focusTargetId: computeFocusAfterDelete(snapshot, clientId),
          selectedIds: new Set([...state.selectedIds].filter((id) => id !== clientId)),
        }));

        if (item.isPending) return;

        try {
          await api.delete<null>(`/items/${item.id}`);
        } catch {
          set({ items: snapshot, focusTargetId: clientId });
        }
      },

      async reorderItems(activeClientId: string, overClientId: string) {
        const snapshot = get().items;
        const reorderedItems = reorderEntries(snapshot, activeClientId, overClientId);
        if (reorderedItems === snapshot) return;

        set({ items: reorderedItems });

        const payload: ReorderPayload = {
          items: reorderedItems
            .filter((item) => !item.isPending)
            .map((item, index) => ({ id: item.id, orderIndex: index })),
        };

        if (payload.items.length === 0) return;

        try {
          await api.put<null>('/items/reorder', payload);
        } catch {
          set({ items: snapshot });
        }
      },

      async syncPendingItems() {
        const pendingItems = get().items.filter((item) => item.isPending);
        for (const item of pendingItems) {
          await helpers.persistCreate(item.clientId, getPersistedAfterId(get().items, item.clientId));
        }
      },

      clearFocusTarget() {
        set({ focusTargetId: null });
      },

      clear() {
        helpers.clearAllTimers();
        originalTextMap.clear();
        set({
          items: [],
          isLoading: false,
          focusTargetId: null,
          searchQuery: '',
          selectionMode: false,
          selectedIds: new Set(),
          undoStack: [],
          redoStack: [],
          selectedDate: null,
        });
      },

      // --- S4: Search ---
      setSearchQuery(query: string) {
        set({ searchQuery: query });
      },

      // --- Calendar ---
      setSelectedDate(date: string | null) {
        set({ selectedDate: date, items: [], searchQuery: '' });
        void get().loadItems();
      },

      // --- S4: Bulk selection ---
      toggleSelectionMode() {
        set((state) => ({
          selectionMode: !state.selectionMode,
          selectedIds: new Set(),
        }));
      },

      toggleItemSelection(clientId: string) {
        set((state) => {
          const next = new Set(state.selectedIds);
          if (next.has(clientId)) {
            next.delete(clientId);
          } else {
            next.add(clientId);
          }
          return { selectedIds: next };
        });
      },

      clearSelection() {
        set({ selectedIds: new Set(), selectionMode: false });
      },

      async deleteSelected() {
        const ids = [...get().selectedIds];
        // Clear selection first so UI responds immediately
        set({ selectedIds: new Set(), selectionMode: false });
        for (const clientId of ids) {
          await get().deleteItem(clientId);
        }
      },

      // --- Toggle heading / task type (preserves text) ---
      async toggleHeading(clientId: string) {
        const item = get().items.find((entry) => entry.clientId === clientId);
        if (!item) return;

        const newType: ItemType = item.type === 'heading' ? 'task' : 'heading';

        pushCommand({
          async undo() { await get().toggleHeading(clientId); },
          async redo() { await get().toggleHeading(clientId); },
        });

        set((state) => ({
          items: replaceEntry(state.items, clientId, (entry) => ({
            ...entry,
            type: newType,
            updatedAt: Date.now(),
            syncError: false,
          })),
        }));

        if (!item.isPending) {
          await helpers.commitUpdate(clientId, { type: newType });
        }
      },

      // --- Category ---
      async setCategory(clientId: string, category: ItemCategory | null) {
        const item = get().items.find((entry) => entry.clientId === clientId);
        if (!item) return;

        set((state) => ({
          items: replaceEntry(state.items, clientId, (entry) => ({
            ...entry,
            category,
            updatedAt: Date.now(),
            syncError: false,
          })),
        }));

        if (!item.isPending) {
          await helpers.commitUpdate(clientId, { category });
        }
      },

      // --- Item deadline (dueDate independent of calendar filter) ---
      async setItemDueDate(clientId: string, dueDate: string | null) {
        const item = get().items.find((entry) => entry.clientId === clientId);
        if (!item) return;

        set((state) => ({
          items: replaceEntry(state.items, clientId, (entry) => ({
            ...entry,
            dueDate,
            updatedAt: Date.now(),
            syncError: false,
          })),
        }));

        if (!item.isPending) {
          await helpers.commitUpdate(clientId, { dueDate });
        }
      },

      // --- S4: Undo/Redo ---
      async undo() {
        const { undoStack } = get();
        if (undoStack.length === 0) return;
        const cmd = undoStack[undoStack.length - 1];
        set((state) => ({
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack.slice(-49), cmd],
        }));
        await withoutHistory(() => cmd.undo());
      },

      async redo() {
        const { redoStack } = get();
        if (redoStack.length === 0) return;
        const cmd = redoStack[redoStack.length - 1];
        set((state) => ({
          redoStack: state.redoStack.slice(0, -1),
          undoStack: [...state.undoStack.slice(-49), cmd],
        }));
        await withoutHistory(() => cmd.redo());
      },
    };
  })(),
}));
