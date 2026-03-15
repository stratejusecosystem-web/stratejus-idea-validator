import http from 'node:http';
import { prisma } from '../db/client.js';
import { createBrand, createStore, listStores } from '../modules/foundation/service.js';
import {
  handleAddProductSource,
  handleAddSeoSignal,
  handleAddTrendSignal,
  handleCreateProductIdea,
  handleDecideProductIdea,
  handleGetIdeaValidatorSnapshot,
  handleScoreProductIdea,
} from '../modules/idea-validator/handlers.js';
import {
  handleGetSeoKeywords,
} from '../modules/seo-architecture/seo-architecture.handler.js';
import {
  validateAddProductSourcePayload,
  validateAddSeoSignalPayload,
  validateAddTrendSignalPayload,
  validateCreateBrandPayload,
  validateCreateProductIdeaPayload,
  validateCreateStorePayload,
  validateDecideProductIdeaPayload,
  validateScoreProductIdeaPayload,
} from './validation.js';

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');

  if (!raw) {
    const error = new Error('Request body is required');
    error.statusCode = 400;
    throw error;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Request body must be valid JSON');
    error.statusCode = 400;
    throw error;
  }
}

async function buildHealthPayload() {
  const [brands, stores, ideas, trendSignals, seoSignals, scores, decisions, integrations] = await Promise.all([
    prisma.brand.count(),
    prisma.store.count(),
    prisma.productIdea.count(),
    prisma.trendSignal.count(),
    prisma.seoSignal.count(),
    prisma.opportunityScore.count(),
    prisma.productDecision.count(),
    prisma.integration.count(),
  ]);

  return {
    status: 'ok',
    service: 'strategus-core-http',
    mode: 'core-v1',
    counts: {
      brands,
      stores,
      ideas,
      trendSignals,
      seoSignals,
      scores,
      decisions,
      integrations,
    },
  };
}

function extractIdeaIdFromUrl(url) {
  const match = /^\/api\/product-ideas\/([^/]+)$/.exec(url);
  return match?.[1] ?? null;
}


import { seoArchitectureRouter } from '../modules/seo-architecture/router.js';

async function routeRequest(req, res) {
  const seoArchitectureResult = await seoArchitectureRouter(req, res);
  if (seoArchitectureResult) {
    return sendJson(res, seoArchitectureResult.statusCode, seoArchitectureResult.body);
  }

  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, await buildHealthPayload());
  }

  if (req.method === 'GET' && req.url === '/api/stores') {
    return sendJson(res, 200, { status: 'ok', data: await listStores() });
  }

  if (req.method === 'GET') {
    const productIdeaId = extractIdeaIdFromUrl(req.url);
    if (productIdeaId) {
      const snapshot = await handleGetIdeaValidatorSnapshot(productIdeaId);
      if (!snapshot) {
        return sendJson(res, 404, { status: 'error', error: 'ProductIdea not found' });
      }
      return sendJson(res, 200, { status: 'ok', data: snapshot });
    }
  }

  if (req.method !== 'POST') {
    return sendJson(res, 404, { status: 'not_found' });
  }

  const payload = await readJsonBody(req);

  if (req.url === '/api/brands') {
    return sendJson(res, 201, {
      status: 'ok',
      data: await createBrand(validateCreateBrandPayload(payload)),
    });
  }

  if (req.url === '/api/stores') {
    return sendJson(res, 201, {
      status: 'ok',
      data: await createStore(validateCreateStorePayload(payload)),
    });
  }

  if (req.url === '/api/product-ideas') {
    return sendJson(res, 201, {
      status: 'ok',
      data: await handleCreateProductIdea(validateCreateProductIdeaPayload(payload)),
    });
  }

  if (req.url === '/api/product-ideas/source') {
    return sendJson(res, 201, {
      status: 'ok',
      data: await handleAddProductSource(validateAddProductSourcePayload(payload)),
    });
  }

  if (req.url === '/api/product-ideas/signals/trend') {
    return sendJson(res, 201, {
      status: 'ok',
      data: await handleAddTrendSignal(validateAddTrendSignalPayload(payload)),
    });
  }

  if (req.url === '/api/product-ideas/signals/seo') {
    return sendJson(res, 201, {
      status: 'ok',
      data: await handleAddSeoSignal(validateAddSeoSignalPayload(payload)),
    });
  }

  if (req.url === '/api/product-ideas/score') {
    return sendJson(res, 201, {
      status: 'ok',
      data: await handleScoreProductIdea(validateScoreProductIdeaPayload(payload)),
    });
  }

  if (req.url === '/api/product-ideas/decision') {
    return sendJson(res, 201, {
      status: 'ok',
      data: await handleDecideProductIdea(validateDecideProductIdeaPayload(payload)),
    });
  }



  return sendJson(res, 404, { status: 'not_found' });
}

export async function startHttpServer({ port = Number(process.env.PORT || 3000) } = {}) {
  await prisma.$connect();

  const server = http.createServer((req, res) => {
    routeRequest(req, res).catch((error) => {
      const statusCode = error.statusCode || 500;
      sendJson(res, statusCode, {
        status: 'error',
        error: error.message,
      });
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });

  return server;
}
