export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  rootDir: "../../",
  roots: [
    "<rootDir>/tests/contracts",
    "<rootDir>/tests/integration",
    "<rootDir>/packages/concern-registry"
  ]
};
