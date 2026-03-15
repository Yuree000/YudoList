import { api } from '../lib/api';
import { replaceEntry, toListEntry, type ListEntry } from '../lib/listModels';
import type { CreateItemPayload, ListItem, UpdateItemPayload } from '../sharedTypes';

type TimerId = ReturnType<typeof setTimeout>;

interface StoreSlice {
  items: ListEntry[];
  focusTargetId: string | null;
}

type SetStore = (
  partial:
    | Partial<StoreSlice>
    | ((state: StoreSlice) => Partial<StoreSlice>),
) => void;

type GetStore = () => StoreSlice;

const textSaveTimers = new Map<string, TimerId>();

export function createListStoreHelpers(set: SetStore, get: GetStore) {
  async function commitUpdate(clientId: string, patch: UpdateItemPayload) {
    const item = get().items.find((entry) => entry.clientId === clientId);
    if (!item || item.isPending) {
      return;
    }

    set((state) => ({
      items: replaceEntry(state.items, clientId, (entry) => ({
        ...entry,
        isSaving: true,
        syncError: false,
      })),
    }));

    try {
      const updatedItem = await api.patch<ListItem>(`/items/${item.id}`, patch);
      set((state) => ({
        items: replaceEntry(state.items, clientId, (entry) => ({
          ...toListEntry(updatedItem),
          clientId: entry.clientId,
        })),
      }));
    } catch {
      set((state) => ({
        items: replaceEntry(state.items, clientId, (entry) => ({
          ...entry,
          isSaving: false,
          syncError: true,
        })),
      }));
    }
  }

  async function persistCreate(clientId: string, afterId: string | undefined) {
    const item = get().items.find((entry) => entry.clientId === clientId);
    if (!item || !item.isPending || item.isSaving) {
      return;
    }

    const payload: CreateItemPayload = {
      text: item.text,
      type: item.type,
      level: item.level,
      afterId,
      dueDate: item.dueDate,
      startTime: item.startTime,
      endTime: item.endTime,
      category: item.category,
    };

    set((state) => ({
      items: replaceEntry(state.items, clientId, (entry) => ({
        ...entry,
        isSaving: true,
        syncError: false,
      })),
    }));

    try {
      const createdItem = await api.post<ListItem>('/items', payload);
      const latestEntry = get().items.find((entry) => entry.clientId === clientId);

      if (!latestEntry) {
        await api.delete<null>(`/items/${createdItem.id}`);
        return;
      }

      const localPatch: UpdateItemPayload = {};

      if (latestEntry.text !== createdItem.text) localPatch.text = latestEntry.text;
      if (latestEntry.level !== createdItem.level) localPatch.level = latestEntry.level;
      if (latestEntry.type !== createdItem.type) localPatch.type = latestEntry.type;
      if (latestEntry.completed !== createdItem.completed) localPatch.completed = latestEntry.completed;

      set((state) => ({
        items: replaceEntry(state.items, clientId, (entry) => ({
          ...toListEntry(createdItem),
          clientId: entry.clientId,
          text: latestEntry.text,
          level: latestEntry.level,
          type: latestEntry.type,
          completed: latestEntry.completed,
        })),
      }));

      if (Object.keys(localPatch).length > 0) {
        await commitUpdate(clientId, localPatch);
      }
    } catch {
      set((state) => ({
        items: replaceEntry(state.items, clientId, (entry) => ({
          ...entry,
          isSaving: false,
          syncError: true,
        })),
      }));
    }
  }

  function clearTimer(clientId: string) {
    const timer = textSaveTimers.get(clientId);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    textSaveTimers.delete(clientId);
  }

  function scheduleTextSave(clientId: string, callback: () => void) {
    clearTimer(clientId);
    textSaveTimers.set(clientId, setTimeout(callback, 800));
  }

  function clearAllTimers() {
    textSaveTimers.forEach((timer) => clearTimeout(timer));
    textSaveTimers.clear();
  }

  return {
    clearAllTimers,
    clearTimer,
    commitUpdate,
    persistCreate,
    scheduleTextSave,
  };
}
