export const aggregateCoverage = (values = []) => {
  if (values.length === 0) {
    return 0;
  }
  const product = values.reduce((acc, value) => acc * value, 1);
  return Number(Math.pow(product, 1 / values.length).toFixed(3));
};

export const computeValueDensity = (input = {}) => {
  const quality = input.quality ?? 0;
  const coverage = input.coverage ?? 0;
  const cost = input.cost ?? 1;
  const latency = input.latency ?? 1;
  return Number(((quality * coverage) / Math.max(cost * latency, 1)).toFixed(4));
};

export const normalizeLatency = (input) => {
  const p95 = typeof input === "number" ? input : (input?.p95 ?? 0);
  const p99 = typeof input === "number" ? input : (input?.p99 ?? p95);
  return { p95, p99 };
};

export const percentile = (values, pct) => {
  if (!values?.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * pct)));
  return sorted[index];
};

export const updateEma = (current, next, alpha = 0.3) => {
  return current + (next - current) * alpha;
};

export const normalizeCaps = (caps) => caps ?? {};

export const buildReplayEnvironment = (input) => input;
export const createReplayDescriptor = (descriptor) => ({
  ...(descriptor ?? {}),
  id: descriptor?.request?.requestId ?? "replay-stub",
});
export const hashIdentifier = (value) => String(value ?? "");
export const persistReplayDescriptor = () => undefined;
export const sanitizePayload = (payload) => payload;
