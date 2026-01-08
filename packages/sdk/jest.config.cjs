const baseConfig = require("../../jest.config.cjs");

const baseTsTransform =
  baseConfig.transform["^.+\\.[cm]?[tj]sx?$"] || baseConfig.transform["^.+\\.[tj]sx?$"];

module.exports = {
  ...baseConfig,
  rootDir: "../..",
  testMatch: ["**/packages/sdk/tests/**/*.(test|spec).ts"],
  extensionsToTreatAsEsm: [".ts", ".tsx", ".mts"],
  setupFilesAfterEnv: [],
  transform: {
    "^.+\\.[cm]?[tj]sx?$": [
      "ts-jest",
      {
        ...(baseTsTransform ? baseTsTransform[1] : {}),
        tsconfig: "tsconfig.json",
      },
    ],
  },
};
