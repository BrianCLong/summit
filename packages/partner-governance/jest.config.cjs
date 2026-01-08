const path = require("path");

module.exports = {
  testEnvironment: "node",
  rootDir: __dirname,
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: path.join(__dirname, "tsconfig.json"), useESM: true }],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "js", "json"],
};
