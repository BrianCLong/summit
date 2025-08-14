module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/tests/warRoomSync.test.js',
    '/src/tests/aiExtraction.test.js'
  ],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/database/**",
    "!src/graphql/resolvers.js",
    "!src/appFactory.js"
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  reporters: ["default", ["/Users/brianlong/Documents/GitHub/intelgraph/server/node_modules/jest-junit", { outputDirectory: "coverage", outputName: "junit.xml" }]],
};