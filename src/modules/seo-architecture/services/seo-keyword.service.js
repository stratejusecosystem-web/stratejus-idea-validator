
import { prisma as db } from '../../../db/client.js';

export const getSeoKeywords = async (storeId) => {
  return db.seoKeyword.findMany({
    where: { storeId },
  });
};

export const createSeoKeyword = async (data) => {
  return db.seoKeyword.create({
    data,
  });
};

export const getSeoKeywordById = async (id) => {
  return db.seoKeyword.findUnique({
    where: { id },
  });
};

export const updateSeoKeyword = async (id, data) => {
  return db.seoKeyword.update({
    where: { id },
    data,
  });
};

export const deleteSeoKeyword = async (id) => {
  return db.seoKeyword.delete({
    where: { id },
  });
};
