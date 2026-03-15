import { prisma } from '../../db/client.js';
import { ensureIdMapping, resolveInternalId } from '../id-mapping/service.js';

function compactObject(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export async function upsertCustomerFromExternal({
  tenant = 'default',
  system,
  externalId,
  data,
}) {
  const existingInternalId = externalId
    ? await resolveInternalId({ tenant, system, entityType: 'customer', externalId })
    : null;

  const customer = existingInternalId
    ? await prisma.customer.update({
        where: { id: existingInternalId },
        data: compactObject(data),
      })
    : await prisma.customer.upsert({
        where: { email: data.email },
        create: data,
        update: compactObject(data),
      });

  if (externalId) {
    await ensureIdMapping({
      tenant,
      system,
      entityType: 'customer',
      externalId,
      internalId: customer.id,
    });
  }

  return customer;
}

export async function upsertProductFromExternal({
  tenant = 'default',
  system,
  externalId,
  data,
}) {
  const existingInternalId = externalId
    ? await resolveInternalId({ tenant, system, entityType: 'product', externalId })
    : null;

  const product = existingInternalId
    ? await prisma.product.update({
        where: { id: existingInternalId },
        data: compactObject(data),
      })
    : await prisma.product.upsert({
        where: { sku: data.sku },
        create: data,
        update: compactObject(data),
      });

  if (externalId) {
    await ensureIdMapping({
      tenant,
      system,
      entityType: 'product',
      externalId,
      internalId: product.id,
    });
  }

  return product;
}

export async function upsertOrderFromExternal({
  tenant = 'default',
  system,
  externalId,
  customer,
  order,
  items = [],
}) {
  const customerRecord = await upsertCustomerFromExternal({
    tenant,
    system,
    externalId: customer.externalId,
    data: customer.data,
  });

  const existingInternalId = externalId
    ? await resolveInternalId({ tenant, system, entityType: 'order', externalId })
    : null;

  const orderPayload = {
    source: order.source ?? system,
    externalOrderId: externalId ?? order.externalOrderId ?? null,
    status: order.status,
    currency: order.currency,
    totalAmountCents: order.totalAmountCents,
    customerId: customerRecord.id,
  };

  const orderRecord = existingInternalId
    ? await prisma.order.update({
        where: { id: existingInternalId },
        data: compactObject(orderPayload),
      })
    : orderPayload.externalOrderId
      ? await prisma.order.upsert({
          where: {
            source_externalOrderId: {
              source: orderPayload.source,
              externalOrderId: orderPayload.externalOrderId,
            },
          },
          create: orderPayload,
          update: compactObject(orderPayload),
        })
      : await prisma.order.create({
          data: orderPayload,
        });

  if (externalId) {
    await ensureIdMapping({
      tenant,
      system,
      entityType: 'order',
      externalId,
      internalId: orderRecord.id,
    });
  }

  if (items.length > 0) {
    await prisma.orderItem.deleteMany({ where: { orderId: orderRecord.id } });

    for (const item of items) {
      const productRecord = await upsertProductFromExternal({
        tenant,
        system,
        externalId: item.product.externalId,
        data: item.product.data,
      });

      await prisma.orderItem.create({
        data: {
          orderId: orderRecord.id,
          productId: productRecord.id,
          quantity: item.quantity ?? 1,
          unitPriceCents: item.unitPriceCents,
        },
      });
    }
  }

  return prisma.order.findUnique({
    where: { id: orderRecord.id },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}
