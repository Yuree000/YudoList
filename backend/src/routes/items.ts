import { type ListItem } from '@prisma/client';
import { type FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { authenticate, getAuthenticatedUserId } from '../middleware/auth';
import {
  createItemSchema,
  itemIdParamsSchema,
  reorderSchema,
  updateItemSchema,
} from '../schemas/items';

// Serialize a Prisma ListItem row for the API response.
function serializeItem(item: ListItem) {
  return {
    id: item.id,
    userId: item.userId,
    text: item.text,
    completed: item.completed,
    level: item.level,
    type: item.type,
    orderIndex: item.orderIndex,
    dueDate: item.dueDate ?? null,
    startTime: item.startTime ?? null,
    endTime: item.endTime ?? null,
    category: item.category ?? null,
    createdAt: Number(item.createdAt),
    updatedAt: Number(item.updatedAt),
    deletedAt: item.deletedAt != null ? Number(item.deletedAt) : null,
  };
}

export default async function itemRoutes(app: FastifyInstance) {
  // All item routes require authentication
  app.addHook('preHandler', authenticate);

  // GET /items — list all non-deleted items for the current user
  // Optional query: ?date=YYYY-MM-DD to filter by dueDate
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

  // POST /items — create a new item
  app.post('/', { schema: createItemSchema }, async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    const { text = '', type = 'task', level = 0, afterId, dueDate, startTime, endTime, category } = request.body as {
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
      // Insert after the specified item
      const ref = await prisma.listItem.findFirst({
        where: { id: afterId, userId, deletedAt: null },
      });
      if (!ref) {
        throw new AppError(404, 'NOT_FOUND', 'Reference item not found');
      }
      // Find the next item after the reference
      const next = await prisma.listItem.findFirst({
        where: { userId, deletedAt: null, orderIndex: { gt: ref.orderIndex } },
        orderBy: { orderIndex: 'asc' },
      });
      orderIndex = next ? (ref.orderIndex + next.orderIndex) / 2 : ref.orderIndex + 1;
    } else {
      // Append to the end
      const last = await prisma.listItem.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { orderIndex: 'desc' },
      });
      orderIndex = last ? last.orderIndex + 1 : 0;
    }

    const now = BigInt(Date.now());
    const item = await prisma.listItem.create({
      data: { userId, text, type, level, orderIndex, dueDate: dueDate ?? null, startTime: startTime ?? null, endTime: endTime ?? null, category: category ?? null, createdAt: now, updatedAt: now },
    });

    return reply.status(201).send({
      code: 201,
      message: 'Item created',
      data: serializeItem(item),
    });
  });

  // PATCH /items/:id — update an item
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
      };

      const existing = await prisma.listItem.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Item not found');
      }

      const item = await prisma.listItem.update({
        where: { id },
        data: { ...body, updatedAt: BigInt(Date.now()) },
      });

      return { code: 200, message: 'Item updated', data: serializeItem(item) };
    },
  );

  // DELETE /items/:id — soft-delete an item
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

  // PUT /items/reorder — batch-update orderIndex values
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
