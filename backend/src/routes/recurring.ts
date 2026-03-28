import type { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import {
  buildRecurringItemRows,
  getNextOrderIndex,
  listRecurringDates,
  rebuildFutureSeriesItems,
} from '../lib/recurring';
import { getLocalToday } from '../lib/localDate';
import { serializeRecurringSeries } from '../lib/serializers';
import { authenticate, getAuthenticatedUserId } from '../middleware/auth';
import {
  recurringIdParamsSchema,
  recurringSeriesBodySchema,
} from '../schemas/recurring';

function assertValidWindow(startDate: string, endDate: string) {
  if (startDate > endDate) {
    throw new AppError(400, 'VALIDATION_ERROR', 'startDate must be before or equal to endDate');
  }
}

function assertHasMatchingDates(dates: string[]) {
  if (dates.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'The selected range has no matching dates');
  }
}

export default async function recurringRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request) => {
    const userId = getAuthenticatedUserId(request);
    const series = await prisma.recurringSeries.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      code: 200,
      message: 'Recurring series loaded',
      data: series.map(serializeRecurringSeries),
    };
  });

  app.post('/', { schema: recurringSeriesBodySchema }, async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    const body = request.body as {
      text: string;
      startDate: string;
      endDate: string;
      weekdaysMask: number;
      category?: string | null;
      startTime?: string | null;
      endTime?: string | null;
    };

    assertValidWindow(body.startDate, body.endDate);
    const dates = listRecurringDates(body.startDate, body.endDate, body.weekdaysMask);
    assertHasMatchingDates(dates);

    const series = await prisma.$transaction(async (tx) => {
      const now = BigInt(Date.now());
      const createdSeries = await tx.recurringSeries.create({
        data: {
          userId,
          text: body.text.trim(),
          startDate: body.startDate,
          endDate: body.endDate,
          weekdaysMask: body.weekdaysMask,
          category: body.category ?? null,
          startTime: body.startTime ?? null,
          endTime: body.endTime ?? null,
          pausedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      });

      const startOrderIndex = await getNextOrderIndex(tx, userId);
      await tx.listItem.createMany({
        data: buildRecurringItemRows(createdSeries, dates, startOrderIndex),
      });

      return createdSeries;
    });

    return reply.status(201).send({
      code: 201,
      message: 'Recurring series created',
      data: serializeRecurringSeries(series),
    });
  });

  app.patch(
    '/:id',
    { schema: { ...recurringSeriesBodySchema, params: recurringIdParamsSchema } },
    async (request) => {
      const userId = getAuthenticatedUserId(request);
      const { id } = request.params as { id: string };
      const body = request.body as {
        text: string;
        startDate: string;
        endDate: string;
        weekdaysMask: number;
        category?: string | null;
        startTime?: string | null;
        endTime?: string | null;
      };

      assertValidWindow(body.startDate, body.endDate);

      const existing = await prisma.recurringSeries.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Recurring series not found');
      }

      const futureDates = listRecurringDates(
        body.startDate,
        body.endDate,
        body.weekdaysMask,
        getLocalToday(),
      );
      assertHasMatchingDates(futureDates);

      const series = await prisma.$transaction(async (tx) => {
        const updatedSeries = await tx.recurringSeries.update({
          where: { id },
          data: {
            text: body.text.trim(),
            startDate: body.startDate,
            endDate: body.endDate,
            weekdaysMask: body.weekdaysMask,
            category: body.category ?? null,
            startTime: body.startTime ?? null,
            endTime: body.endTime ?? null,
            pausedAt: null,
            updatedAt: BigInt(Date.now()),
          },
        });

        await rebuildFutureSeriesItems(tx, updatedSeries, futureDates);
        return updatedSeries;
      });

      return {
        code: 200,
        message: 'Recurring series updated',
        data: serializeRecurringSeries(series),
      };
    },
  );

  app.delete(
    '/:id',
    { schema: { params: recurringIdParamsSchema } },
    async (request) => {
      const userId = getAuthenticatedUserId(request);
      const { id } = request.params as { id: string };

      const existing = await prisma.recurringSeries.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Recurring series not found');
      }

      const now = BigInt(Date.now());
      const today = getLocalToday();
      const series = await prisma.$transaction(async (tx) => {
        const updatedSeries = await tx.recurringSeries.update({
          where: { id },
          data: {
            pausedAt: now,
            updatedAt: now,
          },
        });

        await tx.listItem.updateMany({
          where: {
            seriesId: id,
            deletedAt: null,
            completed: false,
            dueDate: { gte: today },
          },
          data: {
            deletedAt: now,
            updatedAt: now,
          },
        });

        return updatedSeries;
      });

      return {
        code: 200,
        message: 'Recurring series stopped',
        data: serializeRecurringSeries(series),
      };
    },
  );
}
