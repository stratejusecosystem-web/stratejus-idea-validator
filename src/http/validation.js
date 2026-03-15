const SIGNAL_SOURCE_TYPES = new Set(['keyword', 'url', 'competitor', 'marketplace', 'manual']);
const SCORE_BANDS = new Set(['go', 'test', 'no']);

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value) {
  return value === undefined || value === null || typeof value === 'string';
}

function isOptionalBoolean(value) {
  return value === undefined || typeof value === 'boolean';
}

function isOptionalNumber(value) {
  return value === undefined || typeof value === 'number';
}

function isOptionalObject(value) {
  return value === undefined || (value !== null && typeof value === 'object' && !Array.isArray(value));
}

function validateObject(payload, label = 'Body') {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), `${label} must be a JSON object`);
}

function validateDateString(value, label) {
  if (value === undefined || value === null) return;
  assert(isNonEmptyString(value), `${label} must be a non-empty string when provided`);
  assert(!Number.isNaN(Date.parse(value)), `${label} must be a valid ISO date string`);
}

export function validateCreateBrandPayload(payload) {
  validateObject(payload);
  assert(isNonEmptyString(payload.slug), 'slug is required');
  assert(isNonEmptyString(payload.name), 'name is required');
  assert(isOptionalString(payload.description), 'description must be a string when provided');
  return payload;
}

export function validateCreateStorePayload(payload) {
  validateObject(payload);
  assert(isNonEmptyString(payload.brandId), 'brandId is required');
  assert(isNonEmptyString(payload.slug), 'slug is required');
  assert(isNonEmptyString(payload.name), 'name is required');
  assert(isOptionalString(payload.currencyCode), 'currencyCode must be a string when provided');
  assert(isOptionalString(payload.locale), 'locale must be a string when provided');
  assert(isOptionalString(payload.shopDomain), 'shopDomain must be a string when provided');
  assert(isOptionalBoolean(payload.isActive), 'isActive must be a boolean when provided');
  return payload;
}

function validateIdeaReferencePayload(payload) {
  validateObject(payload);
  assert(isNonEmptyString(payload.productIdeaId), 'productIdeaId is required');
}

export function validateCreateProductIdeaPayload(payload) {
  validateObject(payload);
  assert(isNonEmptyString(payload.brandId), 'brandId is required');
  assert(isNonEmptyString(payload.storeId), 'storeId is required');
  assert(isNonEmptyString(payload.title), 'title is required');
  assert(isOptionalString(payload.keyword), 'keyword must be a string when provided');
  assert(isOptionalString(payload.productUrl), 'productUrl must be a string when provided');
  assert(isOptionalString(payload.notes), 'notes must be a string when provided');
  if (payload.source !== undefined) {
    validateObject(payload.source, 'source');
    assert(SIGNAL_SOURCE_TYPES.has(payload.source.sourceType), 'source.sourceType must be a valid source type');
    assert(isNonEmptyString(payload.source.label), 'source.label is required');
    assert(isOptionalString(payload.source.reference), 'source.reference must be a string when provided');
    assert(isOptionalObject(payload.source.rawPayload), 'source.rawPayload must be an object when provided');
  }
  return payload;
}

export function validateAddProductSourcePayload(payload) {
  validateIdeaReferencePayload(payload);
  assert(SIGNAL_SOURCE_TYPES.has(payload.sourceType), 'sourceType must be a valid source type');
  assert(isNonEmptyString(payload.label), 'label is required');
  assert(isOptionalString(payload.reference), 'reference must be a string when provided');
  assert(isOptionalObject(payload.rawPayload), 'rawPayload must be an object when provided');
  return payload;
}

function validateSignalPayload(payload) {
  validateIdeaReferencePayload(payload);
  assert(isOptionalString(payload.source), 'source must be a string when provided');
  assert(isNonEmptyString(payload.metric), 'metric is required');
  assert(typeof payload.value === 'number' && Number.isFinite(payload.value), 'value must be a finite number');
  assert(isOptionalString(payload.unit), 'unit must be a string when provided');
  assert(isOptionalString(payload.evidenceUrl), 'evidenceUrl must be a string when provided');
  assert(isOptionalObject(payload.rawPayload), 'rawPayload must be an object when provided');
  validateDateString(payload.observedAt, 'observedAt');
  return payload;
}

export function validateAddTrendSignalPayload(payload) {
  return validateSignalPayload(payload);
}

export function validateAddSeoSignalPayload(payload) {
  return validateSignalPayload(payload);
}

export function validateScoreProductIdeaPayload(payload) {
  validateIdeaReferencePayload(payload);
  assert(isOptionalString(payload.scoringMethod), 'scoringMethod must be a string when provided');
  assert(isOptionalString(payload.rationale), 'rationale must be a string when provided');
  return payload;
}

export function validateDecideProductIdeaPayload(payload) {
  validateIdeaReferencePayload(payload);
  assert(SCORE_BANDS.has(payload.decision), 'decision must be one of go/test/no');
  assert(isOptionalString(payload.reason), 'reason must be a string when provided');
  assert(isOptionalString(payload.decidedBy), 'decidedBy must be a string when provided');
  assert(isOptionalString(payload.opportunityScoreId), 'opportunityScoreId must be a string when provided');
  return payload;
}
