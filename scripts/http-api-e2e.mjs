import '../src/lib/env.js';
import { prisma } from '../src/db/client.js';
import { startHttpServer } from '../src/http/server.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(baseUrl, path, body, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json();
  assert(response.status === expectedStatus, `${path} expected ${expectedStatus}, received ${response.status}: ${JSON.stringify(json)}`);
  return json;
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

  const prefix = 'http-e2e-core-v1';

  await prisma.$connect();
  await resetScenarioData(prefix);

  const server = await startHttpServer({ port: 3101 });
  const baseUrl = 'http://127.0.0.1:3101';

  try {
    const brand = await requestJson(
      baseUrl,
      '/api/brands',
      { slug: `${prefix}-brand`, name: 'HTTP E2E Brand', description: 'Test brand' },
      201,
    );

    const store = await requestJson(
      baseUrl,
      '/api/stores',
      {
        brandId: brand.data.id,
        slug: `${prefix}-store`,
        name: 'HTTP E2E Store',
        currencyCode: 'EUR',
        locale: 'fr-FR',
        shopDomain: 'http-e2e-store.myshopify.com',
      },
      201,
    );

    const idea = await requestJson(
      baseUrl,
      '/api/product-ideas',
      {
        brandId: brand.data.id,
        storeId: store.data.id,
        title: 'Lampe de lecture rechargeable',
        keyword: 'lampe lecture rechargeable',
        source: {
          sourceType: 'keyword',
          label: 'Seed keyword',
          reference: 'lampe lecture rechargeable',
          rawPayload: { origin: 'http-e2e' },
        },
      },
      201,
    );

    await requestJson(
      baseUrl,
      '/api/product-ideas/signals/trend',
      {
        productIdeaId: idea.data.id,
        source: 'google_trends',
        metric: 'trend_index',
        value: 82,
        unit: '/100',
      },
      201,
    );

    await requestJson(
      baseUrl,
      '/api/product-ideas/signals/seo',
      {
        productIdeaId: idea.data.id,
        source: 'dataforseo',
        metric: 'keyword_opportunity',
        value: 71,
        unit: '/100',
      },
      201,
    );

    const score = await requestJson(
      baseUrl,
      '/api/product-ideas/score',
      { productIdeaId: idea.data.id, rationale: 'HTTP API score' },
      201,
    );

    const decision = await requestJson(
      baseUrl,
      '/api/product-ideas/decision',
      {
        productIdeaId: idea.data.id,
        opportunityScoreId: score.data.id,
        decision: score.data.band,
        reason: 'Aligned with V1 score',
        decidedBy: 'http-api-e2e',
      },
      201,
    );

    const stores = await requestJson(baseUrl, '/api/stores');
    const snapshot = await requestJson(baseUrl, `/api/product-ideas/${idea.data.id}`);
    const health = await requestJson(baseUrl, '/health');
    const invalid = await requestJson(
      baseUrl,
      '/api/product-ideas',
      { brandId: brand.data.id, title: 'missing store' },
      400,
    );

    assert(
      stores.data.some((entry) => entry.id === store.data.id && entry.slug === `${prefix}-store`),
      'Created store should be present in selector list',
    );
    assert(snapshot.data.scores.length === 1, 'Snapshot should include one score');
    assert(snapshot.data.decisions.length === 1, 'Snapshot should include one decision');
    assert(health.counts.stores >= 1, 'Health should expose at least one store');
    assert(invalid.error === 'storeId is required', 'Validation error response mismatch');
    assert(decision.data.decision === score.data.band, 'Decision should follow score band');

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          endpoints: [
            'GET /health',
            'GET /api/stores',
            'GET /api/product-ideas/:id',
            'POST /api/brands',
            'POST /api/stores',
            'POST /api/product-ideas',
            'POST /api/product-ideas/signals/trend',
            'POST /api/product-ideas/signals/seo',
            'POST /api/product-ideas/score',
            'POST /api/product-ideas/decision',
          ],
          brandId: brand.data.id,
          storeId: store.data.id,
          productIdeaId: idea.data.id,
          score: score.data,
          decision: decision.data,
          healthCounts: health.counts,
        },
        null,
        2,
      ),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect().catch(() => undefined);
  }
}

run().catch((error) => {
  console.error('http-api-e2e:failed', error);
  process.exitCode = 1;
});
