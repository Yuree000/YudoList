import type { ListItem, RecurringSeries } from '@prisma/client';

export function serializeItem(item: ListItem) {
  return {
    id: item.id,
    userId: item.userId,
    text: item.text,
    completed: item.completed,
    completedAt: item.completedAt != null ? Number(item.completedAt) : null,
    level: item.level,
    type: item.type,
    orderIndex: item.orderIndex,
    dueDate: item.dueDate ?? null,
    startTime: item.startTime ?? null,
    endTime: item.endTime ?? null,
    category: item.category ?? null,
    seriesId: item.seriesId ?? null,
    createdAt: Number(item.createdAt),
    updatedAt: Number(item.updatedAt),
    deletedAt: item.deletedAt != null ? Number(item.deletedAt) : null,
  };
}

export function serializeRecurringSeries(series: RecurringSeries) {
  return {
    id: series.id,
    userId: series.userId,
    text: series.text,
    startDate: series.startDate,
    endDate: series.endDate,
    weekdaysMask: series.weekdaysMask,
    category: series.category ?? null,
    startTime: series.startTime ?? null,
    endTime: series.endTime ?? null,
    pausedAt: series.pausedAt != null ? Number(series.pausedAt) : null,
    createdAt: Number(series.createdAt),
    updatedAt: Number(series.updatedAt),
  };
}
