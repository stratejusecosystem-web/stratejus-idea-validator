import './lib/env.js';
import { prisma } from './db/client.js';
import { startHttpServer } from './http/server.js';

async function main() {
  console.log('[stratejus-core] booting');

  if (!process.env.DATABASE_URL) {
    console.warn('[stratejus-core] DATABASE_URL missing; core schema is ready but database is not configured yet.');
    return;
  }

  const [brandCount, storeCount, ideaCount, scoreCount, decisionCount] = await Promise.all([
    prisma.brand.count(),
    prisma.store.count(),
    prisma.productIdea.count(),
    prisma.opportunityScore.count(),
    prisma.productDecision.count(),
  ]);

  const server = await startHttpServer({
    port: Number(process.env.PORT || 3000),
  });

  console.log('[stratejus-core] db connected');
  console.log(
    JSON.stringify(
      {
        brands: brandCount,
        stores: storeCount,
        ideas: ideaCount,
        scores: scoreCount,
        decisions: decisionCount,
      },
      null,
      2,
    ),
  );
  console.log(`[stratejus-core] http listening on http://127.0.0.1:${server.address().port}`);
}

main().catch((error) => {
  console.error('[stratejus-core] fatal', error);
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
}
