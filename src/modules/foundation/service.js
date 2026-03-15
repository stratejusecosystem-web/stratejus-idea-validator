import { prisma } from '../../db/client.js';

function compactObject(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export async function createBrand({ slug, name, description }) {
  return prisma.brand.create({
    data: compactObject({ slug, name, description }),
  });
}

export async function createStore({ brandId, slug, name, currencyCode, locale, shopDomain, isActive }) {
  return prisma.store.create({
    data: compactObject({
      brandId,
      slug,
      name,
      currencyCode,
      locale,
      shopDomain,
      isActive,
    }),
    include: { brand: true },
  });
}

export async function listStores() {
  return prisma.store.findMany({
    include: { brand: true, integrations: true },
    orderBy: [{ createdAt: 'asc' }],
  });
}
