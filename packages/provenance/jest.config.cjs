/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  roots: ["<rootDir>/dist"],
  moduleFileExtensions: ["js", "json"],
  clearMocks: true,
};
