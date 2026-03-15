
import {
  handleGetSeoKeywords,
  handleCreateSeoKeyword,
  handleGetSeoKeywordById,
  handleUpdateSeoKeyword,
  handleDeleteSeoKeyword,
  handleGetSeoClusters,
  handleCreateSeoCluster,
  handleGetSeoClusterById,
  handleUpdateSeoCluster,
  handleDeleteSeoCluster,
  handleGetSeoArchitectures,
  handleCreateSeoArchitecture,
  handleGetSeoArchitectureById,
  handleUpdateSeoArchitecture,
  handleDeleteSeoArchitecture,
  handleGetPageBlueprints,
  handleCreatePageBlueprint,
  handleGetPageBlueprintById,
  handleUpdatePageBlueprint,
  handleDeletePageBlueprint,
  handleGetCollectionBlueprints,
  handleCreateCollectionBlueprint,
  handleGetCollectionBlueprintById,
  handleUpdateCollectionBlueprint,
  handleDeleteCollectionBlueprint,
} from './seo-architecture.handler.js';

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

export const seoArchitectureRouter = async (req, res) => {
    // SEO Keywords
    if (req.url.match(/^\/api\/stores\/([^/]+)\/seo\/keywords$/)) {
        const storeId = req.url.split('/')[3];
        if (req.method === 'GET') {
            const { status, data } = await handleGetSeoKeywords(req, res, storeId);
            return { statusCode: 200, body: { status, data } };
        }
        if (req.method === 'POST') {
            const payload = await readJsonBody(req);
            const { status, data } = await handleCreateSeoKeyword(req, res, { ...payload, storeId });
            return { statusCode: 201, body: { status, data } };
        }
    }
    if (req.url.match(/^\/api\/seo\/keywords\/([^/]+)$/)) {
        const id = req.url.split('/')[4];
        if (req.method === 'GET') {
            const { status, data } = await handleGetSeoKeywordById(req, res, id);
            return { statusCode: 200, body: { status, data } };
        }
        if (req.method === 'PUT') {
            const payload = await readJsonBody(req);
            const { status, data } = await handleUpdateSeoKeyword(req, res, id, payload);
            return { statusCode: 200, body: { status, data } };
        }
        if (req.method === 'DELETE') {
            const { status, data } = await handleDeleteSeoKeyword(req, res, id);
            return { statusCode: 200, body: { status, data } };
        }
    }
    // ... all other models
    return null;
}
