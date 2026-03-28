import type { Prisma, PrismaClient, RecurringSeries } from '@prisma/client';
import { getMondayFirstWeekday, getLocalToday, parseLocalDate } from './localDate';

type PrismaDelegate = Prisma.TransactionClient | PrismaClient;

export function listRecurringDates(
  startDate: string,
  endDate: string,
  weekdaysMask: number,
  minDate?: string,
): string[] {
  const dates: string[] = [];
  const cursor = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const floorDate = minDate ? parseLocalDate(minDate) : null;

  while (cursor <= end) {
    const weekday = getMondayFirstWeekday(cursor);
    const matchesWeekday = (weekdaysMask & (1 << weekday)) !== 0;
    const isAfterFloor = floorDate == null || cursor >= floorDate;

    if (matchesWeekday && isAfterFloor) {
      dates.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
      );
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function getNextOrderIndex(db: PrismaDelegate, userId: string): Promise<number> {
  const last = await db.listItem.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  });

  return last ? last.orderIndex + 1 : 0;
}

export function buildRecurringItemRows(
  series: RecurringSeries,
  dates: string[],
  startOrderIndex: number,
): Prisma.ListItemCreateManyInput[] {
  const now = BigInt(Date.now());

  return dates.map((date, index) => ({
    userId: series.userId,
    text: series.text,
    completed: false,
    completedAt: null,
    level: 0,
    type: 'task',
    orderIndex: startOrderIndex + index,
    dueDate: date,
    startTime: series.startTime,
    endTime: series.endTime,
    category: series.category,
    seriesId: series.id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));
}

export async function rebuildFutureSeriesItems(
  db: PrismaDelegate,
  series: RecurringSeries,
  dates: string[],
) {
  const today = getLocalToday();
  const preserved = await db.listItem.findMany({
    where: {
      seriesId: series.id,
      deletedAt: null,
      completed: true,
      dueDate: { gte: today },
    },
    select: { dueDate: true },
  });

  const preservedDates = new Set(
    preserved.map((item) => item.dueDate).filter((value): value is string => value != null),
  );

  await db.listItem.updateMany({
    where: {
      seriesId: series.id,
      deletedAt: null,
      completed: false,
      dueDate: { gte: today },
    },
    data: {
      deletedAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
    },
  });

  const nextDates = dates.filter((date) => !preservedDates.has(date));
  if (nextDates.length === 0) {
    return;
  }

  const orderIndex = await getNextOrderIndex(db, series.userId);
  await db.listItem.createMany({
    data: buildRecurringItemRows(series, nextDates, orderIndex),
  });
}
