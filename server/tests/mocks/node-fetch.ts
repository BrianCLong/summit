const fetchProxy = (...args: unknown[]) => {
  const implementation = (globalThis as unknown as { fetch?: (...innerArgs: unknown[]) => unknown }).fetch;
  if (typeof implementation !== 'function') {
    throw new Error('global fetch is not available in the Jest environment');
  }
  return implementation(...args);
};

export default fetchProxy as typeof fetch;
