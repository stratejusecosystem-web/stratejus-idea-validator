import {
  addProductSource,
  addSeoSignal,
  addTrendSignal,
  createProductIdea,
  decideProductIdea,
  getIdeaValidatorSnapshot,
  scoreProductIdea,
} from './service.js';

export async function handleCreateProductIdea(payload) {
  return createProductIdea(payload);
}

export async function handleAddProductSource(payload) {
  return addProductSource(payload);
}

export async function handleAddTrendSignal(payload) {
  return addTrendSignal(payload);
}

export async function handleAddSeoSignal(payload) {
  return addSeoSignal(payload);
}

export async function handleScoreProductIdea(payload) {
  return scoreProductIdea(payload);
}

export async function handleDecideProductIdea(payload) {
  return decideProductIdea(payload);
}

export async function handleGetIdeaValidatorSnapshot(productIdeaId) {
  return getIdeaValidatorSnapshot(productIdeaId);
}
