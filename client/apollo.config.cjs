module.exports = {
  client: {
    service: {
      name: 'intelgraph-graphql-service', // Name of your GraphQL service
      url: process.env.VITE_API_URL || 'http://localhost:4000/graphql', // URL to your GraphQL endpoint
    },
    includes: [
      './src/**/*.js',
      './src/**/*.jsx',
      './src/**/*.ts',
      './src/**/*.tsx',
      './src/**/*.graphql',
    ],
    excludes: ['**/node_modules/**', '**/__tests__/**'],
  },
};
