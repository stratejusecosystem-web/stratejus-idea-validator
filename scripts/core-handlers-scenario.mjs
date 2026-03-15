import '../src/lib/env.js';
import { prisma } from '../src/db/client.js';
import {
  handleAddProductSource,
  handleAddSeoSignal,
  handleAddTrendSignal,
  handleCreateProductIdea,
  handleDecideProductIdea,
  handleGetIdeaValidatorSnapshot,
  handleScoreProductIdea,
} from '../src/modules/idea-validator/handlers.js';
import { createBrand, createStore } from '../src/modules/foundation/service.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function resetScenarioData(slugPrefix) {
  await prisma.productDecision.deleteMany({ where: { productIdea: { store: { slug: { startsWith: slugPrefix } } } } });
  await prisma.opportunityScore.deleteMany({ where: { productIdea: { store: { slug: { startsWith: slugPrefix } } } } });
  await prisma.trendSignal.deleteMany({ where: { productIdea: { store: { slug: { startsWith: slugPrefix } } } } });
  await prisma.seoSignal.deleteMany({ where: { productIdea: { store: { slug: { startsWith: slugPrefix } } } } });
  await prisma.productSource.deleteMany({ where: { productIdea: { store: { slug: { startsWith: slugPrefix } } } } });
  await prisma.externalMapping.deleteMany({ where: { store: { slug: { startsWith: slugPrefix } } } });
  await prisma.productIdea.deleteMany({ where: { store: { slug: { startsWith: slugPrefix } } } });
  await prisma.integration.deleteMany({ where: { store: { slug: { startsWith: slugPrefix } } } });
  await prisma.store.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const prefix = 'scenario-core-v1';

  await prisma.$connect();
  await resetScenarioData(prefix);

  const brand = await createBrand({
    slug: `${prefix}-brand`,
    name: 'Scenario Brand',
    description: 'Core V1 scenario brand',
  });

  const store = await createStore({
    brandId: brand.id,
    slug: `${prefix}-store`,
    name: 'Scenario Store',
    currencyCode: 'EUR',
    locale: 'fr-FR',
    shopDomain: 'scenario-store.myshopify.com',
    isActive: true,
  });

  const idea = await handleCreateProductIdea({
    brandId: brand.id,
    storeId: store.id,
    title: 'Oreiller ergonomique premium',
    keyword: 'oreiller ergonomique',
    productUrl: 'https://example.com/products/oreiller-ergonomique',
    notes: 'Premier test tranche 1 validator',
    source: {
      sourceType: 'keyword',
      label: 'Seed keyword',
      reference: 'oreiller ergonomique',
      rawPayload: { origin: 'manual' },
    },
  });

  await handleAddProductSource({
    productIdeaId: idea.id,
    sourceType: 'competitor',
    label: 'Competitor landing page',
    reference: 'https://competitor.test/oreiller-ergonomique',
    rawPayload: { domain: 'competitor.test' },
  });

  await handleAddTrendSignal({
    productIdeaId: idea.id,
    source: 'google_trends',
    metric: 'trend_index',
    value: 78,
    unit: '/100',
    observedAt: new Date().toISOString(),
    evidenceUrl: 'https://trends.google.com/example',
    rawPayload: { keyword: 'oreiller ergonomique' },
  });

  await handleAddSeoSignal({
    productIdeaId: idea.id,
    source: 'dataforseo',
    metric: 'keyword_opportunity',
    value: 64,
    unit: '/100',
    observedAt: new Date().toISOString(),
    evidenceUrl: 'https://dataforseo.example/report',
    rawPayload: { keyword: 'oreiller ergonomique' },
  });

  const score = await handleScoreProductIdea({
    productIdeaId: idea.id,
    rationale: 'Trend + SEO initial tranche 1',
  });

  const decision = await handleDecideProductIdea({
    productIdeaId: idea.id,
    opportunityScoreId: score.id,
    decision: score.band,
    reason: 'Décision alignée sur le score V1',
    decidedBy: 'scenario-script',
  });

  const snapshot = await handleGetIdeaValidatorSnapshot(idea.id);

  assert(snapshot.brand.id === brand.id, 'Snapshot should include brand');
  assert(snapshot.store.id === store.id, 'Snapshot should include store');
  assert(snapshot.sources.length === 2, 'Expected 2 product sources');
  assert(snapshot.trendSignals.length === 1, 'Expected 1 trend signal');
  assert(snapshot.seoSignals.length === 1, 'Expected 1 seo signal');
  assert(snapshot.scores[0].id === score.id, 'Latest score should match');
  assert(snapshot.decisions[0].id === decision.id, 'Latest decision should match');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        brand: { id: brand.id, slug: brand.slug },
        store: { id: store.id, slug: store.slug },
        idea: { id: idea.id, status: snapshot.status, title: snapshot.title },
        score: { id: score.id, score: score.score, band: score.band },
        decision: { id: decision.id, decision: decision.decision },
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error('core-handlers-scenario:failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
