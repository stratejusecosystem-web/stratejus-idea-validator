import '../src/lib/env.js';
import { prisma } from '../src/db/client.js';

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log('db-smoke:ok');
}

run()
  .catch((error) => {
    console.error('db-smoke:failed', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
