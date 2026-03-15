
import { prisma as db } from '../../../db/client.js';

export const getPageBlueprints = async (storeId) => {
  return db.pageBlueprint.findMany({
    where: { storeId },
  });
};

export const createPageBlueprint = async (data) => {
  return db.pageBlueprint.create({
    data,
  });
};

export const getPageBlueprintById = async (id) => {
  return db.pageBlueprint.findUnique({
    where: { id },
  });
};

export const updatePageBlueprint = async (id, data) => {
  return db.pageBlueprint.update({
    where: { id },
    data,
  });
};

export const deletePageBlueprint = async (id) => {
  return db.pageBlueprint.delete({
    where: { id },
  });
};
