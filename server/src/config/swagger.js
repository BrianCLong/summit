"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
// @ts-nocheck
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const config_js_1 = require("../config.js");
const options = {
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
                url: `http://localhost:${config_js_1.cfg.PORT}`,
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
    apis: ['./src/routes/*.js', './src/routes/*.js', './src/http/*.js'], // Path to the API docs
};
exports.swaggerSpec = process.env.DISABLE_SWAGGER === 'true'
    ? {
        openapi: '3.0.0',
        info: {
            title: 'IntelGraph API',
            version: '1.0.0',
            description: 'Swagger disabled for test environment',
        },
    }
    : (0, swagger_jsdoc_1.default)(options);
