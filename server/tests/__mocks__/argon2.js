// server/tests/__mocks__/argon2.js
module.exports = {
  hash: jest.fn().mockResolvedValue('mocked_hash'),
  verify: jest.fn().mockResolvedValue(true),
};
