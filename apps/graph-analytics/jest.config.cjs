const path = require("path");
const baseConfig = require("../../jest.config.cjs");

module.exports = {
  ...baseConfig,
  rootDir: path.resolve(__dirname, "../.."),
  roots: ["<rootDir>/apps/graph-analytics/src"],
  testEnvironment: "node",
};
