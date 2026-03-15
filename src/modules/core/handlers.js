import { upsertCustomerFromExternal, upsertOrderFromExternal, upsertProductFromExternal } from './service.js';

export async function handleCustomerUpsert(payload) {
  return upsertCustomerFromExternal(payload);
}

export async function handleProductUpsert(payload) {
  return upsertProductFromExternal(payload);
}

export async function handleOrderUpsert(payload) {
  return upsertOrderFromExternal(payload);
}
