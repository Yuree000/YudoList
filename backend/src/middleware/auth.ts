import { type FastifyRequest } from 'fastify';
import { verifyToken } from '../lib/auth';
import { AppError } from '../lib/errors';

/**
 * Fastify preHandler hook that extracts and verifies a Bearer token.
 */
export async function authenticate(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
  }

  try {
    const token = header.slice(7);
    const payload = verifyToken(token);
    request.userId = payload.userId;
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Token expired or invalid');
  }
}

export function getAuthenticatedUserId(request: FastifyRequest): string {
  if (!request.userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  return request.userId;
}
