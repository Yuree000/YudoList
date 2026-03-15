import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  const now = BigInt(Date.now());

  const user = await prisma.user.upsert({
    where: { email: 'test@yudolist.dev' },
    update: {
      username: 'testuser',
      passwordHash: await hashPassword('password123'),
      updatedAt: now,
    },
    create: {
      username: 'testuser',
      email: 'test@yudolist.dev',
      passwordHash: await hashPassword('password123'),
      createdAt: now,
      updatedAt: now,
    },
  });

  const sampleItems = [
    { text: 'Work', type: 'heading', level: 0, orderIndex: 0 },
    { text: 'Review pull requests', type: 'task', level: 1, orderIndex: 1 },
    { text: 'Update project documentation', type: 'task', level: 1, orderIndex: 2 },
    { text: 'Personal', type: 'heading', level: 0, orderIndex: 3 },
    { text: 'Buy groceries', type: 'task', level: 1, orderIndex: 4, completed: true },
    { text: 'Read a book chapter', type: 'task', level: 1, orderIndex: 5 },
  ];

  await prisma.$transaction([
    prisma.listItem.deleteMany({ where: { userId: user.id } }),
    prisma.listItem.createMany({
      data: sampleItems.map((item) => ({
        userId: user.id,
        text: item.text,
        type: item.type,
        level: item.level,
        orderIndex: item.orderIndex,
        completed: item.completed ?? false,
        createdAt: now,
        updatedAt: now,
      })),
    }),
  ]);

  console.log(`Seeded user: ${user.username} (${user.email})`);
  console.log(`Seeded ${sampleItems.length} items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
