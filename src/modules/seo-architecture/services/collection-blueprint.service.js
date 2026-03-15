
import { prisma as db } from '../../../db/client.js';

export const getCollectionBlueprints = async (storeId) => {
  return db.collectionBlueprint.findMany({
    where: { storeId },
  });
};

export const createCollectionBlueprint = async (data) => {
  return db.collectionBlueprint.create({
    data,
  });
};

export const getCollectionBlueprintById = async (id) => {
  return db.collectionBlueprint.findUnique({
    where: { id },
  });
};

export const updateCollectionBlueprint = async (id, data) => {
  return db.collectionBlueprint.update({
    where: { id },
    data,
  });
};

export const deleteCollectionBlueprint = async (id) => {
  return db.collectionBlueprint.delete({
    where: { id },
  });
};
