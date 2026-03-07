/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(.*)\\.js$": "$1",
  },
  roots: ["<rootDir>/libs/ops/src"],
};
