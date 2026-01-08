/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/__tests__"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.|..)/(.+)\\.js$": "$1$2",
  },
  globals: {
    "ts-jest": {
      useESM: true,
      diagnostics: false,
    },
  },
};
