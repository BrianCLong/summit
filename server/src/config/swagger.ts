import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'IntelGraph Summit API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the IntelGraph Summit platform. Includes REST endpoints for Authentication, Orchestration (Maestro), Health, and more.',
      contact: {
        name: 'API Support',
        url: 'https://docs.intelgraph.tech/support',
        email: 'api@intelgraph.tech',
      },
      license: {
        name: 'Proprietary',
        url: 'https://intelgraph.tech/license',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Current Server (Relative Path)',
      },
      {
        url: 'http://localhost:4000/api',
        description: 'Local Development Server',
      },
      {
        url: 'https://api.intelgraph.tech/v1',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        // Common schemas can be referenced here or merged from external files
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts',
    './src/maestro/**/*.ts',
    './src/docs/schemas.ts'
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
