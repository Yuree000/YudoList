// Shared type definitions used by both frontend and backend.

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type ItemType = 'task' | 'heading';
export type ItemCategory = '学习' | '生活' | '工作';

export interface ListItem {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  level: number;       // 0-4
  type: ItemType;
  orderIndex: number;
  dueDate: string | null;    // "YYYY-MM-DD" or null
  startTime: string | null;  // "HH:MM" or null
  endTime: string | null;    // "HH:MM" or null
  category: ItemCategory | null;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface CreateItemPayload {
  text?: string;
  type?: ItemType;
  level?: number;
  afterId?: string;
  dueDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  category?: ItemCategory | null;
}

export interface UpdateItemPayload {
  text?: string;
  completed?: boolean;
  level?: number;
  type?: ItemType;
  dueDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  category?: ItemCategory | null;
}

export interface ReorderPayload {
  items: { id: string; orderIndex: number }[];
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface ApiError {
  code: number;
  message: string;
  error: string;
}
