module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts'],
  roots: ['<rootDir>/src/plugins'],
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          esModuleInterop: true,
          types: ['node'],
        },
      },
    },
  },
};
