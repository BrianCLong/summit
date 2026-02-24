function encode(input) {
  if (typeof input !== 'string') {
    return [];
  }
  return Array.from({ length: input.length }, (_, i) => i);
}

module.exports = { encode };
