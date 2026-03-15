
import { prisma as db } from '../../../db/client.js';

export const getSeoClusters = async (storeId) => {
  return db.seoCluster.findMany({
    where: { storeId },
  });
};

export const createSeoCluster = async (data) => {
  return db.seoCluster.create({
    data,
  });
};

export const getSeoClusterById = async (id) => {
  return db.seoCluster.findUnique({
    where: { id },
  });
};

export const updateSeoCluster = async (id, data) => {
  return db.seoCluster.update({
    where: { id },
    data,
  });
};

export const deleteSeoCluster = async (id) => {
  return db.seoCluster.delete({
    where: { id },
  });
};
