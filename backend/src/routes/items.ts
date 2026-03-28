import { type FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { serializeItem } from '../lib/serializers';
import { authenticate, getAuthenticatedUserId } from '../middleware/auth';
import {
  createItemSchema,
  itemIdParamsSchema,
  reorderSchema,
  updateItemSchema,
} from '../schemas/items';

export default async function itemRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request) => {
    const userId = getAuthenticatedUserId(request);
    const { date } = request.query as { date?: string };

    const where: Record<string, unknown> = { userId, deletedAt: null };
    if (date) {
      where.dueDate = date;
    }

    const items = await prisma.listItem.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
    });

    return { code: 200, message: 'Items loaded', data: items.map(serializeItem) };
  });

  app.post('/', { schema: createItemSchema }, async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    const {
      text = '',
      type = 'task',
      level = 0,
      afterId,
      dueDate,
      startTime,
      endTime,
      category,
    } = request.body as {
      text?: string;
      type?: string;
      level?: number;
      afterId?: string;
      dueDate?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      category?: string | null;
    };

    let orderIndex: number;
    if (afterId) {
      const ref = await prisma.listItem.findFirst({
        where: { id: afterId, userId, deletedAt: null },
      });
      if (!ref) {
        throw new AppError(404, 'NOT_FOUND', 'Reference item not found');
      }

      const next = await prisma.listItem.findFirst({
        where: { userId, deletedAt: null, orderIndex: { gt: ref.orderIndex } },
        orderBy: { orderIndex: 'asc' },
      });
      orderIndex = next ? (ref.orderIndex + next.orderIndex) / 2 : ref.orderIndex + 1;
    } else {
      const last = await prisma.listItem.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { orderIndex: 'desc' },
      });
      orderIndex = last ? last.orderIndex + 1 : 0;
    }

    const now = BigInt(Date.now());
    const item = await prisma.listItem.create({
      data: {
        userId,
        text,
        type,
        level,
        orderIndex,
        dueDate: dueDate ?? null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        category: category ?? null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    });

    return reply.status(201).send({
      code: 201,
      message: 'Item created',
      data: serializeItem(item),
    });
  });

  app.patch(
    '/:id',
    { schema: { ...updateItemSchema, params: itemIdParamsSchema } },
    async (request) => {
      const userId = getAuthenticatedUserId(request);
      const { id } = request.params as { id: string };
      const body = request.body as {
        text?: string;
        completed?: boolean;
        level?: number;
        type?: string;
        dueDate?: string | null;
        startTime?: string | null;
        endTime?: string | null;
        category?: string | null;
      };

      const existing = await prisma.listItem.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Item not found');
      }

      const updatedAt = BigInt(Date.now());
      const item = await prisma.listItem.update({
        where: { id },
        data: {
          ...body,
          completedAt:
            body.completed === undefined
              ? undefined
              : body.completed
                ? (existing.completedAt ?? updatedAt)
                : null,
          updatedAt,
        },
      });

      return { code: 200, message: 'Item updated', data: serializeItem(item) };
    },
  );

  app.delete(
    '/:id',
    { schema: { params: itemIdParamsSchema } },
    async (request) => {
      const userId = getAuthenticatedUserId(request);
      const { id } = request.params as { id: string };

      const existing = await prisma.listItem.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Item not found');
      }

      await prisma.listItem.update({
        where: { id },
        data: { deletedAt: BigInt(Date.now()), updatedAt: BigInt(Date.now()) },
      });

      return { code: 200, message: 'Item deleted', data: null };
    },
  );

  app.post(
    '/:id/restore',
    { schema: { params: itemIdParamsSchema } },
    async (request) => {
      const userId = getAuthenticatedUserId(request);
      const { id } = request.params as { id: string };

      const existing = await prisma.listItem.findFirst({
        where: { id, userId, deletedAt: { not: null } },
      });
      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Item not found');
      }

      const item = await prisma.listItem.update({
        where: { id },
        data: { deletedAt: null, updatedAt: BigInt(Date.now()) },
      });

      return { code: 200, message: 'Item restored', data: serializeItem(item) };
    },
  );

  app.put('/reorder', { schema: reorderSchema }, async (request) => {
    const userId = getAuthenticatedUserId(request);
    const { items } = request.body as { items: { id: string; orderIndex: number }[] };

    if (items.length === 0) {
      return { code: 200, message: 'Reorder skipped', data: null };
    }

    const uniqueIds = Array.from(new Set(items.map((item) => item.id)));
    const existingItems = await prisma.listItem.findMany({
      where: {
        id: { in: uniqueIds },
        userId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingItems.length !== uniqueIds.length) {
      throw new AppError(404, 'NOT_FOUND', 'One or more items were not found');
    }

    const updatedAt = BigInt(Date.now());
    await prisma.$transaction(
      items.map((item) =>
        prisma.listItem.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex, updatedAt },
        }),
      ),
    );

    return { code: 200, message: 'Reorder successful', data: null };
  });
}
