import { PrismaClient } from '@prisma/client';

// Single PrismaClient instance shared across the application.
const prisma = new PrismaClient();

export default prisma;
