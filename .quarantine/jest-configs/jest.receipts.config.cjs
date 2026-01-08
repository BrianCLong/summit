module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: [
    "<rootDir>/packages/provenance/__tests__",
    "<rootDir>/services/receipt-signer/__tests__",
    "<rootDir>/apps/api/__tests__",
  ],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  haste: {
    throwOnModuleCollision: false,
  },
};
