import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import prisma from './lib/prisma';
import { AppError, errorResponse } from './lib/errors';
import authRoutes from './routes/auth';
import itemRoutes from './routes/items';
import aiRoutes from './routes/ai';
import activityRoutes from './routes/activity';
import recurringRoutes from './routes/recurring';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

async function registerApiRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(itemRoutes, { prefix: '/items' });
  await app.register(aiRoutes, { prefix: '/ai' });
  await app.register(activityRoutes, { prefix: '/activity' });
  await app.register(recurringRoutes, { prefix: '/recurring' });
}

async function main() {
  const app = Fastify({ logger: false });

  app.decorateRequest('userId', null);

  // CORS
  await app.register(cors, { origin: CORS_ORIGIN });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(
        errorResponse(error.statusCode, error.message, error.errorCode),
      );
    }

    const validationError = error as Error & {
      validation?: Array<{ message?: string }>;
    };

    if (validationError.validation) {
      const message = validationError.validation[0]?.message
        ? `Request validation failed: ${validationError.validation[0].message}`
        : 'Request validation failed';

      return reply.status(400).send(errorResponse(400, message, 'VALIDATION_ERROR'));
    }

    request.log.error(error);
    return reply.status(500).send(
      errorResponse(500, 'Internal server error', 'INTERNAL_SERVER_ERROR'),
    );
  });

  app.setNotFoundHandler((request, reply) => {
    reply
      .status(404)
      .send(errorResponse(404, `Route ${request.method} ${request.url} not found`, 'NOT_FOUND'));
  });

  await app.register(registerApiRoutes);
  await app.register(registerApiRoutes, { prefix: '/api/v1' });

  // Verify database connection
  try {
    await prisma.$connect();
    await prisma.$executeRawUnsafe(
      'UPDATE "list_items" SET "completed_at" = "updated_at" WHERE "completed" = 1 AND "completed_at" IS NULL',
    );
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  // Start server
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Listening on :${PORT} (${process.env.NODE_ENV || 'development'})`);

  // Graceful shutdown
  const shutdown = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
