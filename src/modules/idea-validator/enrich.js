/**
 * Enricher — the missing "data fetcher" of the Idea Validator.
 *
 * Ties the Freudix source + normalisation to the existing service layer:
 *   idea (keyword) -> Freudix metrics + trend -> normalised signals
 *   -> persisted via addSeoSignal/addTrendSignal -> scoreProductIdea.
 *
 * This is what turns the validator from mock data into a one-call, real-data
 * GO/TEST/NO verdict. It reuses the domain functions in ./service.js rather than
 * writing to Prisma directly, so all invariants (brand/store scoping, scoring
 * math, status transitions) stay in one place.
 */

import { getKeywordMetrics, getSeoTrends } from './sources/freudix.js';
import { buildSignals } from './sources/normalize.js';
import {
  createProductIdea,
  addSeoSignal,
  addTrendSignal,
  scoreProductIdea,
  getIdeaValidatorSnapshot,
} from './service.js';

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Best-effort trend hint for a keyword, derived from Freudix "trending now".
 * Most niche keywords won't be in the live trends list → returns {} (neutral),
 * which the normaliser scores as 50 (no reward, no penalty).
 * @param {string} keyword
 * @param {Array<object>} [trends] pre-fetched trends to avoid a second call
 */
export async function deriveTrendHint(keyword, trends) {
  const list = trends ?? (await getSeoTrends({ limit: 25 })).trends;
  const target = normalizeText(keyword);
  if (!target) return {};

  const match = list.find((t) => {
    const k = normalizeText(t.keyword);
    return k === target || k.includes(target) || target.includes(k);
  });
  if (!match) return {};

  // Freudix trend deltas look like "+220 %"; parse to a number when present.
  let deltaPct;
  if (typeof match.delta === 'string') {
    const parsed = Number(match.delta.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(parsed)) deltaPct = parsed;
  }
  return { deltaPct, direction: deltaPct == null ? 'up' : undefined, traffic: match.trends_traffic ?? null };
}

/**
 * Fetch Freudix data for an existing idea, persist the signals, and (re)score it.
 * @param {{ productIdeaId: string, keyword: string, country?: string, trendHint?: object }} params
 * @returns {Promise<{ score: object|null, insufficientSeoData: boolean, liveAnalysisUrl: string|null, metrics: object, signals: { seo: number, trend: number } }>}
 */
export async function enrichAndScoreIdea({ productIdeaId, keyword, country = 'FR', trendHint }) {
  const metrics = await getKeywordMetrics(keyword, country);
  const trend = trendHint ?? (await deriveTrendHint(keyword));
  const { seoSignals, trendSignals, insufficientSeoData, liveAnalysisUrl } = buildSignals(
    { ...metrics, keyword },
    trend,
  );

  const observedAt = new Date();
  for (const s of seoSignals) {
    await addSeoSignal({ productIdeaId, observedAt, evidenceUrl: metrics.raw?.analyze_live ?? null, ...s });
  }
  for (const s of trendSignals) {
    await addTrendSignal({ productIdeaId, observedAt, ...s });
  }

  // Only score when we have at least one signal; otherwise the verdict would be
  // a misleading NO. Insufficient-data ideas are left "under_review".
  let score = null;
  if (seoSignals.length + trendSignals.length > 0 && !insufficientSeoData) {
    score = await scoreProductIdea({
      productIdeaId,
      scoringMethod: 'v1-freudix',
      rationale: `Freudix: vol=${metrics.volume ?? 'n/a'}, cpc=${metrics.cpc ?? 'n/a'}, comp=${metrics.competitionLabel ?? 'n/a'}`,
    });
  }

  return {
    score,
    insufficientSeoData,
    liveAnalysisUrl,
    metrics,
    signals: { seo: seoSignals.length, trend: trendSignals.length },
  };
}

/**
 * Convenience for the "Mot-clé" tab: create an idea from a keyword, enrich it
 * with Freudix, score it, and return the full snapshot.
 * @param {{ brandId: string, storeId: string, keyword: string, title?: string, country?: string }} params
 */
export async function validateKeyword({ brandId, storeId, keyword, title, country = 'FR' }) {
  const idea = await createProductIdea({
    brandId,
    storeId,
    title: title ?? keyword,
    keyword,
    source: { sourceType: 'keyword', label: 'Idea Validator', reference: keyword },
  });

  const result = await enrichAndScoreIdea({ productIdeaId: idea.id, keyword, country });
  const snapshot = await getIdeaValidatorSnapshot(idea.id);
  return { idea, ...result, snapshot };
}

/**
 * Batch validation for the "Batch" tab. Runs sequentially to stay gentle on the
 * public Freudix endpoint; returns one result row per keyword.
 */
export async function validateKeywordBatch({ brandId, storeId, keywords, country = 'FR' }) {
  const rows = [];
  for (const keyword of keywords) {
    try {
      const r = await validateKeyword({ brandId, storeId, keyword, country });
      rows.push({
        keyword,
        band: r.insufficientSeoData ? 'insufficient_data' : r.score?.band ?? null,
        score: r.score?.score ?? null,
        volume: r.metrics.volume,
        cpc: r.metrics.cpc,
        competition: r.metrics.competition,
      });
    } catch (error) {
      rows.push({ keyword, band: 'error', error: error.message });
    }
  }
  return rows;
}
