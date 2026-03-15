import { prisma } from '../../db/client.js';

function buildExternalKey({ tenant = 'default', system, entityType, externalId }) {
  return {
    tenant_system_entityType_externalId: {
      tenant,
      system,
      entityType,
      externalId,
    },
  };
}

function buildInternalKey({ tenant = 'default', system, entityType, internalId }) {
  return {
    tenant_system_entityType_internalId: {
      tenant,
      system,
      entityType,
      internalId,
    },
  };
}

export async function ensureIdMapping({
  tenant = 'default',
  system,
  entityType,
  externalId,
  internalId,
  active = true,
}) {
  const existingByExternal = await prisma.idMapping.findUnique({
    where: buildExternalKey({ tenant, system, entityType, externalId }),
  });

  if (existingByExternal && existingByExternal.internalId !== internalId) {
    throw new Error(
      `IdMapping conflict on external key ${tenant}/${system}/${entityType}/${externalId}: expected ${existingByExternal.internalId}, received ${internalId}`,
    );
  }

  const existingByInternal = await prisma.idMapping.findUnique({
    where: buildInternalKey({ tenant, system, entityType, internalId }),
  });

  if (existingByInternal && existingByInternal.externalId !== externalId) {
    throw new Error(
      `IdMapping conflict on internal key ${tenant}/${system}/${entityType}/${internalId}: expected ${existingByInternal.externalId}, received ${externalId}`,
    );
  }

  return prisma.idMapping.upsert({
    where: buildExternalKey({ tenant, system, entityType, externalId }),
    create: {
      tenant,
      system,
      entityType,
      externalId,
      internalId,
      active,
    },
    update: {
      internalId,
      active,
    },
  });
}

export async function resolveInternalId({ tenant = 'default', system, entityType, externalId }) {
  const mapping = await prisma.idMapping.findUnique({
    where: buildExternalKey({ tenant, system, entityType, externalId }),
  });

  return mapping?.internalId ?? null;
}
