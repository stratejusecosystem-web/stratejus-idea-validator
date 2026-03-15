import {
  getSeoKeywords,
  createSeoKeyword,
  getSeoKeywordById,
  updateSeoKeyword,
  deleteSeoKeyword,
} from './services/seo-keyword.service.js';

import {
  getSeoClusters,
  createSeoCluster,
  getSeoClusterById,
  updateSeoCluster,
  deleteSeoCluster,
} from './services/seo-cluster.service.js';

import {
  getSeoArchitectures,
  createSeoArchitecture,
  getSeoArchitectureById,
  updateSeoArchitecture,
  deleteSeoArchitecture,
} from './services/seo-architecture.service.js';

import {
  getCollectionBlueprints,
  createCollectionBlueprint,
  getCollectionBlueprintById,
  updateCollectionBlueprint,
  deleteCollectionBlueprint,
} from './services/collection-blueprint.service.js';

import {
  getPageBlueprints,
  createPageBlueprint,
  getPageBlueprintById,
  updatePageBlueprint,
  deletePageBlueprint,
} from './services/page-blueprint.service.js';

// ── SEO Keywords ───────────────────────────────────────────────────────────────
export const handleGetSeoKeywords = async (req, res, storeId) => {
  const keywords = await getSeoKeywords(storeId);
  return { status: 'ok', data: keywords };
};

export const handleCreateSeoKeyword = async (req, res, payload) => {
  const keyword = await createSeoKeyword(payload);
  return { status: 'ok', data: keyword };
};

export const handleGetSeoKeywordById = async (req, res, id) => {
  const keyword = await getSeoKeywordById(id);
  if (!keyword) return { status: 'not_found' };
  return { status: 'ok', data: keyword };
};

export const handleUpdateSeoKeyword = async (req, res, id, payload) => {
  const keyword = await updateSeoKeyword(id, payload);
  return { status: 'ok', data: keyword };
};

export const handleDeleteSeoKeyword = async (req, res, id) => {
  await deleteSeoKeyword(id);
  return { status: 'ok' };
};

// ── SEO Clusters ───────────────────────────────────────────────────────────────
export const handleGetSeoClusters = async (req, res, storeId) => {
  const clusters = await getSeoClusters(storeId);
  return { status: 'ok', data: clusters };
};

export const handleCreateSeoCluster = async (req, res, payload) => {
  const cluster = await createSeoCluster(payload);
  return { status: 'ok', data: cluster };
};

export const handleGetSeoClusterById = async (req, res, id) => {
  const cluster = await getSeoClusterById(id);
  if (!cluster) return { status: 'not_found' };
  return { status: 'ok', data: cluster };
};

export const handleUpdateSeoCluster = async (req, res, id, payload) => {
  const cluster = await updateSeoCluster(id, payload);
  return { status: 'ok', data: cluster };
};

export const handleDeleteSeoCluster = async (req, res, id) => {
  await deleteSeoCluster(id);
  return { status: 'ok' };
};

// ── SEO Architectures ──────────────────────────────────────────────────────────
export const handleGetSeoArchitectures = async (req, res, storeId) => {
  const architectures = await getSeoArchitectures(storeId);
  return { status: 'ok', data: architectures };
};

export const handleCreateSeoArchitecture = async (req, res, payload) => {
  const architecture = await createSeoArchitecture(payload);
  return { status: 'ok', data: architecture };
};

export const handleGetSeoArchitectureById = async (req, res, id) => {
  const architecture = await getSeoArchitectureById(id);
  if (!architecture) return { status: 'not_found' };
  return { status: 'ok', data: architecture };
};

export const handleUpdateSeoArchitecture = async (req, res, id, payload) => {
  const architecture = await updateSeoArchitecture(id, payload);
  return { status: 'ok', data: architecture };
};

export const handleDeleteSeoArchitecture = async (req, res, id) => {
  await deleteSeoArchitecture(id);
  return { status: 'ok' };
};

// ── Collection Blueprints ──────────────────────────────────────────────────────
export const handleGetCollectionBlueprints = async (req, res, storeId) => {
  const blueprints = await getCollectionBlueprints(storeId);
  return { status: 'ok', data: blueprints };
};

export const handleCreateCollectionBlueprint = async (req, res, payload) => {
  const blueprint = await createCollectionBlueprint(payload);
  return { status: 'ok', data: blueprint };
};

export const handleGetCollectionBlueprintById = async (req, res, id) => {
  const blueprint = await getCollectionBlueprintById(id);
  if (!blueprint) return { status: 'not_found' };
  return { status: 'ok', data: blueprint };
};

export const handleUpdateCollectionBlueprint = async (req, res, id, payload) => {
  const blueprint = await updateCollectionBlueprint(id, payload);
  return { status: 'ok', data: blueprint };
};

export const handleDeleteCollectionBlueprint = async (req, res, id) => {
  await deleteCollectionBlueprint(id);
  return { status: 'ok' };
};

// ── Page Blueprints ────────────────────────────────────────────────────────────
export const handleGetPageBlueprints = async (req, res, storeId) => {
  const blueprints = await getPageBlueprints(storeId);
  return { status: 'ok', data: blueprints };
};

export const handleCreatePageBlueprint = async (req, res, payload) => {
  const blueprint = await createPageBlueprint(payload);
  return { status: 'ok', data: blueprint };
};

export const handleGetPageBlueprintById = async (req, res, id) => {
  const blueprint = await getPageBlueprintById(id);
  if (!blueprint) return { status: 'not_found' };
  return { status: 'ok', data: blueprint };
};

export const handleUpdatePageBlueprint = async (req, res, id, payload) => {
  const blueprint = await updatePageBlueprint(id, payload);
  return { status: 'ok', data: blueprint };
};

export const handleDeletePageBlueprint = async (req, res, id) => {
  await deletePageBlueprint(id);
  return { status: 'ok' };
};
