// Minimal Jest-friendly mock for argon2 native module
const mock = {
  hash: async (input) => `mockhash:${typeof input === 'string' ? input : ''}`,
  verify: async () => true,
};

export default mock;
module.exports.default = mock;
