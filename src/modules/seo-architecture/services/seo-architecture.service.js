
import { prisma as db } from '../../../db/client.js';

export const getSeoArchitectures = async (storeId) => {
  return db.seoArchitecture.findMany({
    where: { storeId },
  });
};

export const createSeoArchitecture = async (data) => {
  return db.seoArchitecture.create({
    data,
  });
};

export const getSeoArchitectureById = async (id) => {
  return db.seoArchitecture.findUnique({
    where: { id },
  });
};

export const updateSeoArchitecture = async (id, data) => {
  return db.seoArchitecture.update({
    where: { id },
    data,
  });
};

export const deleteSeoArchitecture = async (id) => {
  return db.seoArchitecture.delete({
    where: { id },
  });
};
