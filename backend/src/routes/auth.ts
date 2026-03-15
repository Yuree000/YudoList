import { type User } from '@prisma/client';
import { type FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { hashPassword, verifyPassword, signToken } from '../lib/auth';
import { AppError } from '../lib/errors';
import { authenticate, getAuthenticatedUserId } from '../middleware/auth';
import { registerSchema, loginSchema } from '../schemas/auth';

// Serialize a Prisma User row into a safe API response object.
function serializeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? undefined,
    createdAt: Number(user.createdAt),
    updatedAt: Number(user.updatedAt),
  };
}

export default async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post('/register', { schema: registerSchema }, async (request, reply) => {
    const body = request.body as {
      username: string;
      email: string;
      password: string;
    };
    const username = body.username.trim();
    const email = body.email.trim().toLowerCase();
    const { password } = body;

    // Check for duplicate email or username
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      throw new AppError(409, 'CONFLICT', `${field} already exists`);
    }

    const now = BigInt(Date.now());
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await hashPassword(password),
        createdAt: now,
        updatedAt: now,
      },
    });

    const token = signToken(user.id);
    return reply.status(201).send({
      code: 201,
      message: 'User created',
      data: { user: serializeUser(user), token },
    });
  });

  // POST /auth/login
  app.post('/login', { schema: loginSchema }, async (request, reply) => {
    const body = request.body as { email: string; password: string };
    const email = body.email.trim().toLowerCase();
    const { password } = body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    const token = signToken(user.id);
    return reply.status(200).send({
      code: 200,
      message: 'Login successful',
      data: { user: serializeUser(user), token },
    });
  });

  // GET /auth/profile — requires authentication
  app.get('/profile', { preHandler: [authenticate] }, async (request) => {
    const userId = getAuthenticatedUserId(request);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }
    return { code: 200, message: 'Profile loaded', data: serializeUser(user) };
  });
}
