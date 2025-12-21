import swaggerJsdoc from 'swagger-jsdoc';
import { cfg } from '../config.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IntelGraph API',
      version: '1.0.0',
      description: 'API documentation for the IntelGraph platform',
      contact: {
        name: 'API Support',
        email: 'support@intelgraph.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${cfg.PORT}`,
        description: 'Development server',
      },
      {
        url: 'https://api.intelgraph.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js', './src/http/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
