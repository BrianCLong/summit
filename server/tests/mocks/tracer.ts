export const initializeTracing = () => ({ initialize: () => {} });
export const getTracer = () => ({ startSpan: () => ({ end: () => {} }) });
