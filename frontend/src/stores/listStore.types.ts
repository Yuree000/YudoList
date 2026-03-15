import type { ItemCategory, ItemType } from '../sharedTypes';
import type { ListEntry } from '../lib/listModels';

export interface CreateItemOptions {
  afterClientId?: string;
  level?: number;
  type?: ItemType;
  text?: string;
  dueDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  category?: ItemCategory | null;
}

export interface UndoableCommand {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export interface ListState {
  items: ListEntry[];
  isLoading: boolean;
  focusTargetId: string | null;
  // S4: search
  searchQuery: string;
  // S4: bulk selection
  selectionMode: boolean;
  selectedIds: Set<string>;
  // S4: undo/redo
  undoStack: UndoableCommand[];
  redoStack: UndoableCommand[];
  // Calendar: selected date filter ("YYYY-MM-DD" or null = all items)
  selectedDate: string | null;

  loadItems: () => Promise<ListEntry[]>;
  createItem: (options: CreateItemOptions) => Promise<string>;
  updateText: (clientId: string, text: string) => void;
  flushTextSave: (clientId: string) => Promise<void>;
  toggleComplete: (clientId: string) => Promise<void>;
  changeLevel: (clientId: string, delta: number) => Promise<void>;
  convertToHeading: (clientId: string) => Promise<void>;
  deleteItem: (clientId: string) => Promise<void>;
  reorderItems: (activeClientId: string, overClientId: string) => Promise<void>;
  syncPendingItems: () => Promise<void>;
  clearFocusTarget: () => void;
  clear: () => void;

  // S4: search
  setSearchQuery: (query: string) => void;
  // S4: bulk selection
  toggleSelectionMode: () => void;
  toggleItemSelection: (clientId: string) => void;
  clearSelection: () => void;
  deleteSelected: () => Promise<void>;
  // S4: undo/redo
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  // Calendar
  setSelectedDate: (date: string | null) => void;
  // Category label
  setCategory: (clientId: string, category: ItemCategory | null) => Promise<void>;
  // Deadline (set dueDate on a specific item, independent of calendar filter)
  setItemDueDate: (clientId: string, dueDate: string | null) => Promise<void>;
  // Toggle between task and heading type (preserves text)
  toggleHeading: (clientId: string) => Promise<void>;
}
