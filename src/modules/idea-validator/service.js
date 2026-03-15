import { prisma } from '../../db/client.js';

function compactObject(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

async function getIdeaOrThrow(productIdeaId) {
  const idea = await prisma.productIdea.findUnique({ where: { id: productIdeaId } });

  if (!idea) {
    const error = new Error(`ProductIdea not found: ${productIdeaId}`);
    error.statusCode = 404;
    throw error;
  }

  return idea;
}

export async function createProductIdea({ brandId, storeId, title, keyword, productUrl, notes, source }) {
  const idea = await prisma.productIdea.create({
    data: {
      brandId,
      storeId,
      title,
      keyword,
      productUrl,
      notes,
      status: 'under_review',
      sources: source
        ? {
            create: {
              brandId,
              storeId,
              sourceType: source.sourceType,
              label: source.label,
              reference: source.reference,
              rawPayload: source.rawPayload,
            },
          }
        : undefined,
    },
    include: { sources: true },
  });

  return idea;
}

export async function addProductSource({ productIdeaId, sourceType, label, reference, rawPayload }) {
  const idea = await getIdeaOrThrow(productIdeaId);

  return prisma.productSource.create({
    data: {
      brandId: idea.brandId,
      storeId: idea.storeId,
      productIdeaId,
      sourceType,
      label,
      reference,
      rawPayload,
    },
  });
}

export async function addTrendSignal({ productIdeaId, source, metric, value, unit, observedAt, evidenceUrl, rawPayload }) {
  const idea = await getIdeaOrThrow(productIdeaId);

  return prisma.trendSignal.create({
    data: {
      brandId: idea.brandId,
      storeId: idea.storeId,
      productIdeaId,
      source,
      metric,
      value,
      unit,
      observedAt,
      evidenceUrl,
      rawPayload,
    },
  });
}

export async function addSeoSignal({ productIdeaId, source, metric, value, unit, observedAt, evidenceUrl, rawPayload }) {
  const idea = await getIdeaOrThrow(productIdeaId);

  return prisma.seoSignal.create({
    data: {
      brandId: idea.brandId,
      storeId: idea.storeId,
      productIdeaId,
      source,
      metric,
      value,
      unit,
      observedAt,
      evidenceUrl,
      rawPayload,
    },
  });
}

function average(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resolveBand(score) {
  if (score >= 70) return 'go';
  if (score >= 45) return 'test';
  return 'no';
}

export async function scoreProductIdea({ productIdeaId, scoringMethod, rationale }) {
  const idea = await prisma.productIdea.findUnique({
    where: { id: productIdeaId },
    include: {
      trendSignals: true,
      seoSignals: true,
      scores: { orderBy: [{ version: 'desc' }], take: 1 },
    },
  });

  if (!idea) {
    const error = new Error(`ProductIdea not found: ${productIdeaId}`);
    error.statusCode = 404;
    throw error;
  }

  const trendValues = idea.trendSignals.map((signal) => signal.value);
  const seoValues = idea.seoSignals.map((signal) => signal.value);
  const trendAverage = average(trendValues);
  const seoAverage = average(seoValues);

  const trendContribution = trendAverage === null ? 0 : Math.max(0, Math.min(100, Math.round(trendAverage)));
  const seoContribution = seoAverage === null ? 0 : Math.max(0, Math.min(100, Math.round(seoAverage)));
  const coverageBonus = Math.min(20, idea.trendSignals.length * 5 + idea.seoSignals.length * 5);
  const score = Math.max(0, Math.min(100, Math.round(trendContribution * 0.45 + seoContribution * 0.45 + coverageBonus)));
  const band = resolveBand(score);
  const version = (idea.scores[0]?.version ?? 0) + 1;

  const created = await prisma.opportunityScore.create({
    data: {
      brandId: idea.brandId,
      storeId: idea.storeId,
      productIdeaId,
      version,
      score,
      band,
      scoringMethod: scoringMethod ?? 'v1-manual-weighting',
      rationale,
      breakdown: {
        trendAverage,
        seoAverage,
        trendSignals: idea.trendSignals.length,
        seoSignals: idea.seoSignals.length,
        coverageBonus,
      },
    },
  });

  await prisma.productIdea.update({
    where: { id: productIdeaId },
    data: { status: 'scored' },
  });

  return created;
}

export async function decideProductIdea({ productIdeaId, decision, reason, decidedBy, opportunityScoreId }) {
  const idea = await getIdeaOrThrow(productIdeaId);

  const finalDecision = decision ?? (() => {
    throw new Error('decision is required');
  })();

  const created = await prisma.productDecision.create({
    data: compactObject({
      brandId: idea.brandId,
      storeId: idea.storeId,
      productIdeaId,
      opportunityScoreId,
      decision: finalDecision,
      reason,
      decidedBy,
    }),
  });

  await prisma.productIdea.update({
    where: { id: productIdeaId },
    data: { status: 'decided' },
  });

  return created;
}

export async function getIdeaValidatorSnapshot(productIdeaId) {
  return prisma.productIdea.findUnique({
    where: { id: productIdeaId },
    include: {
      brand: true,
      store: true,
      sources: true,
      trendSignals: true,
      seoSignals: true,
      scores: { orderBy: [{ version: 'desc' }] },
      decisions: { orderBy: [{ createdAt: 'desc' }] },
    },
  });
}
