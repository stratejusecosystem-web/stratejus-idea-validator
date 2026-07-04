/**
 * Normalisation — turns raw Freudix metrics into 0..100 signal values that the
 * Idea Validator scoring engine understands.
 *
 * The scoring engine (idea-validator/service.js -> scoreProductIdea) averages
 * SeoSignal / TrendSignal `value`s, each expected in [0,100], then computes:
 *   score = seoAvg*0.45 + trendAvg*0.45 + coverageBonus(<=20)
 *   band  = >=70 go, >=45 test, else no
 *
 * So each raw metric must be mapped to a "higher = better opportunity" 0..100
 * note. The mappings below are intentionally simple, monotonic and documented so
 * the weighting can be tuned later without guesswork.
 */

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round1 = (n) => Math.round(n * 100) / 100;

/**
 * Demand from search volume — log-scaled so it rewards existing demand without
 * letting mega-terms dominate (their saturation is penalised by competition).
 *   ~50/mo -> 34, 1k -> 60, 10k -> 80, 100k -> 100.
 */
export function volumeScore(volume) {
  if (volume == null || !Number.isFinite(volume) || volume <= 0) return 0;
  return clamp(Math.round((Math.log10(volume) / Math.log10(100000)) * 100));
}

/**
 * Opportunity from competition — INVERSE: low competition = open market = high
 * note. `competition` is a 0..1 ratio (0.16 = 16%). 16% -> 84, 100% -> 0.
 */
export function competitionScore(competition) {
  if (competition == null || !Number.isFinite(competition)) return null;
  return clamp(Math.round((1 - competition) * 100));
}

/**
 * Commercial intent from CPC — advertisers only bid on keywords with buyers, so
 * a higher CPC signals real purchase intent. Capped so a huge CPC can't max the
 * whole score. 0.8€ -> 20, 2.67€ -> 67, >=4€ -> 100.
 */
export function cpcScore(cpc) {
  if (cpc == null || !Number.isFinite(cpc) || cpc <= 0) return null;
  return clamp(Math.round((cpc / 4) * 100));
}

/**
 * Momentum from a trend delta / direction. Neutral (50) when unknown so a
 * missing trend neither rewards nor punishes an idea.
 * @param {{ direction?: 'up'|'stable'|'down', deltaPct?: number }} [trend]
 */
export function trendScore(trend = {}) {
  const { direction, deltaPct } = trend;
  if (Number.isFinite(deltaPct)) {
    // -50% -> 0, 0% -> 50, +100% -> 100 (linear, clamped).
    return clamp(Math.round(50 + deltaPct / 2));
  }
  if (direction === 'up') return 75;
  if (direction === 'down') return 30;
  if (direction === 'stable') return 50;
  return 50; // unknown
}

/**
 * Build the SeoSignal / TrendSignal payloads for one idea from a Freudix
 * keyword result (see freudix.getKeywordMetrics) and an optional trend hint.
 * Returns the signal rows plus a human-readable preview of the resulting score.
 *
 * @param {object} kw    result of getKeywordMetrics()
 * @param {object} [trend] { direction, deltaPct, traffic }
 */
export function buildSignals(kw, trend = {}) {
  const seoSignals = [];

  // IMPORTANT: found=false means "keyword not in Freudix' dataset" = UNKNOWN,
  // not zero demand. Emitting volume=0 would fabricate a false NO verdict, so we
  // emit no SEO signal and flag the idea as needing a live check instead.
  const insufficientSeoData = !kw.found || kw.volume == null;

  if (!insufficientSeoData) {
    seoSignals.push({
      source: 'freudix',
      metric: 'search_volume',
      value: volumeScore(kw.volume),
      unit: 'score',
      rawPayload: { search_volume: kw.volume },
    });

    const cScore = competitionScore(kw.competition);
    if (cScore != null) {
      seoSignals.push({
        source: 'freudix',
        metric: 'competition_inverse',
        value: cScore,
        unit: 'score',
        rawPayload: { competition: kw.competition, competition_label: kw.competitionLabel },
      });
    }

    const cpc = cpcScore(kw.cpc);
    if (cpc != null) {
      seoSignals.push({
        source: 'freudix',
        metric: 'cpc_intent',
        value: cpc,
        unit: 'score',
        rawPayload: { cpc: kw.cpc },
      });
    }
  }

  // The scoring engine weights trend at 45%. Freudix only knows "trending now",
  // so most keywords have no trend → we MUST emit a neutral (50) trend signal
  // rather than none, otherwise a missing trend counts as 0 and an idea can
  // never reach GO on strong SEO alone (structural cap at ~65). The rawPayload
  // marks it `known: false` so this stays transparent and tunable.
  const knownTrend = Number.isFinite(trend.deltaPct) || Boolean(trend.direction);
  const trendSignals = [
    {
      source: 'freudix',
      metric: 'search_trend',
      value: trendScore(trend),
      unit: 'score',
      rawPayload: {
        known: knownTrend,
        direction: trend.direction ?? null,
        deltaPct: trend.deltaPct ?? null,
        traffic: trend.traffic ?? null,
      },
    },
  ];

  const preview = previewScore(seoSignals, trendSignals);
  return {
    seoSignals,
    trendSignals,
    insufficientSeoData,
    // When Freudix has no volume, the score is not trustworthy → the flow should
    // surface a "validate live" state instead of a NO. Freudix points to /niche.
    liveAnalysisUrl: insufficientSeoData
      ? `https://freudix.studio/niche?q=${encodeURIComponent(kw.keyword ?? '')}`
      : null,
    preview: insufficientSeoData ? { ...preview, band: 'insufficient_data' } : preview,
  };
}

/**
 * Mirror of scoreProductIdea's math so callers can preview the verdict without
 * a DB round-trip. Keep in sync with idea-validator/service.js.
 */
export function previewScore(seoSignals, trendSignals) {
  const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x.value, 0) / arr.length : null);
  const seoAvg = avg(seoSignals);
  const trendAvg = avg(trendSignals);
  const seoContribution = seoAvg == null ? 0 : clamp(Math.round(seoAvg));
  const trendContribution = trendAvg == null ? 0 : clamp(Math.round(trendAvg));
  const coverageBonus = Math.min(20, seoSignals.length * 5 + trendSignals.length * 5);
  const score = clamp(Math.round(trendContribution * 0.45 + seoContribution * 0.45 + coverageBonus));
  const band = score >= 70 ? 'go' : score >= 45 ? 'test' : 'no';
  return { score, band, seoAvg: seoAvg == null ? null : round1(seoAvg), trendAvg: trendAvg == null ? null : round1(trendAvg), coverageBonus };
}
