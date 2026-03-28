import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import {
  formatLocalDate,
  getLocalDayEndExclusiveMs,
  getLocalDayStartMs,
  getLocalToday,
  shiftLocalDate,
} from '../lib/localDate';
import { authenticate, getAuthenticatedUserId } from '../middleware/auth';

const activityQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      days: { type: 'integer', minimum: 1, maximum: 60, default: 14 },
    },
    additionalProperties: false,
  },
} as const;

export default async function activityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', { schema: activityQuerySchema }, async (request) => {
    const userId = getAuthenticatedUserId(request);
    const { days = 14 } = request.query as { days?: number };

    const endDate = getLocalToday();
    const startDate = shiftLocalDate(endDate, -(days - 1));
    const completedItems = await prisma.listItem.findMany({
      where: {
        userId,
        deletedAt: null,
        completedAt: {
          gte: BigInt(getLocalDayStartMs(startDate)),
          lt: BigInt(getLocalDayEndExclusiveMs(endDate)),
        },
      },
      select: { completedAt: true },
    });

    const counts = new Map<string, number>();
    for (const item of completedItems) {
      if (item.completedAt == null) {
        continue;
      }

      const date = formatLocalDate(new Date(Number(item.completedAt)));
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }

    const data = Array.from({ length: days }, (_, index) => {
      const date = shiftLocalDate(startDate, index);
      return {
        date,
        completedCount: counts.get(date) ?? 0,
      };
    });

    return { code: 200, message: 'Activity loaded', data };
  });
}
