/**
 * Freudix connector — data source for the Idea Validator.
 *
 * Freudix (https://freudix.studio) exposes a PUBLIC MCP server (no token) over
 * HTTP JSON-RPC. We use it to enrich a product idea with real SEO metrics:
 * search volume, CPC, competition (keyword_volume) and trending queries
 * (search_seo_trends).
 *
 * Transport: plain `fetch` JSON-RPC (initialize → tools/call). No SDK.
 * The MCP session id is negotiated once and cached; it is re-negotiated
 * transparently if the server drops it.
 *
 * All calls are best-effort: on network/parse errors we return a `found: false`
 * shaped result rather than throwing, so the validator never crashes because an
 * external source is down. The caller decides how to score a missing signal.
 */

const FREUDIX_MCP_URL = process.env.FREUDIX_MCP_URL ?? 'https://freudix.studio/api/mcp';
const REQUEST_TIMEOUT_MS = Number(process.env.FREUDIX_TIMEOUT_MS ?? 15000);
const PROTOCOL_VERSION = '2025-03-26';

let sessionId = null;
let rpcId = 0;

function nextId() {
  rpcId += 1;
  return rpcId;
}

/** Parse an MCP HTTP response body that is either raw JSON or an SSE stream. */
function parseRpcBody(body) {
  const trimmed = body.trimStart();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  for (const line of body.split('\n')) {
    if (line.startsWith('data:')) {
      const payload = line.slice(5).trim();
      if (payload) {
        try {
          return JSON.parse(payload);
        } catch {
          // keep scanning subsequent data: lines
        }
      }
    }
  }
  throw new Error('Freudix: unparseable MCP response');
}

async function postRpc(payload, { includeSession = true } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (includeSession && sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(FREUDIX_MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const returnedSession = res.headers.get('mcp-session-id');
    if (returnedSession) {
      sessionId = returnedSession;
    }
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } finally {
    clearTimeout(timer);
  }
}

async function ensureSession() {
  if (sessionId) return;

  const init = await postRpc(
    {
      jsonrpc: '2.0',
      id: nextId(),
      method: 'initialize',
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'stratejus-idea-validator', version: '1.0.0' },
      },
    },
    { includeSession: false },
  );

  parseRpcBody(init.body); // throws if the handshake failed

  // Best-effort "initialized" notification; some servers require it before tools/call.
  try {
    await postRpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
  } catch {
    // non-fatal
  }
}

/**
 * Call a Freudix MCP tool and return its parsed JSON payload.
 * Freudix tools return their data as a JSON string inside content[].text.
 */
async function callTool(name, args, { retry = true } = {}) {
  await ensureSession();

  const res = await postRpc({
    jsonrpc: '2.0',
    id: nextId(),
    method: 'tools/call',
    params: { name, arguments: args },
  });

  const rpc = parseRpcBody(res.body);

  // Session expired / not found → re-handshake once.
  if (rpc.error && retry) {
    sessionId = null;
    return callTool(name, args, { retry: false });
  }
  if (rpc.error) {
    throw new Error(`Freudix tool ${name} error: ${rpc.error.message ?? 'unknown'}`);
  }

  const textPart = (rpc.result?.content ?? [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');

  try {
    return JSON.parse(textPart);
  } catch {
    // Some tools may return prose; surface it under `message`.
    return { message: textPart };
  }
}

/**
 * Search-volume / CPC / competition for a single keyword.
 * @param {string} keyword
 * @param {'FR'|'UK'|'US'} [country]
 * @returns {Promise<{
 *   keyword: string, country: string, found: boolean,
 *   volume: number|null, cpc: number|null,
 *   competition: number|null, competitionLabel: string|null,
 *   source: 'freudix', raw: object
 * }>}
 */
export async function getKeywordMetrics(keyword, country = 'FR') {
  const term = String(keyword ?? '').trim();
  if (!term) {
    return {
      keyword: term,
      country,
      found: false,
      volume: null,
      cpc: null,
      competition: null,
      competitionLabel: null,
      source: 'freudix',
      raw: {},
    };
  }

  try {
    const data = await callTool('keyword_volume', { keyword: term, country });
    const found = data?.found === true;
    return {
      keyword: term,
      country,
      found,
      volume: found ? Number(data.search_volume ?? null) : null,
      cpc: found && data.cpc != null ? Number(data.cpc) : null,
      competition: found && data.competition != null ? Number(data.competition) : null,
      competitionLabel: found ? (data.competition_label ?? null) : null,
      source: 'freudix',
      raw: data ?? {},
    };
  } catch (error) {
    return {
      keyword: term,
      country,
      found: false,
      volume: null,
      cpc: null,
      competition: null,
      competitionLabel: null,
      source: 'freudix',
      raw: { error: error.message },
    };
  }
}

/**
 * Current Google search trends (FR) with real search volumes when available.
 * @param {{ query?: string, limit?: number }} [opts]
 * @returns {Promise<{ geo: string, trends: Array<object>, source: 'freudix', raw: object }>}
 */
export async function getSeoTrends({ query, limit = 20 } = {}) {
  try {
    const args = { limit };
    if (query) args.query = query;
    const data = await callTool('search_seo_trends', args);
    return {
      geo: data?.geo ?? 'FR',
      trends: Array.isArray(data?.trends) ? data.trends : [],
      source: 'freudix',
      raw: data ?? {},
    };
  } catch (error) {
    return { geo: 'FR', trends: [], source: 'freudix', raw: { error: error.message } };
  }
}

/**
 * Real affiliate programs for a theme — used to surface a monetisation angle
 * alongside an opportunity score.
 */
export async function getAffiliationPrograms(query, limit = 5) {
  try {
    const data = await callTool('find_affiliation', { query, limit });
    return {
      programs: Array.isArray(data?.programs) ? data.programs : [],
      source: 'freudix',
      raw: data ?? {},
    };
  } catch (error) {
    return { programs: [], source: 'freudix', raw: { error: error.message } };
  }
}
