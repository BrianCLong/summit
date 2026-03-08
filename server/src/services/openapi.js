"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiSpec = void 0;
// @ts-nocheck
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const package_json_1 = require("../../package.json");
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Summit API',
            version: package_json_1.version,
            description: 'API documentation for the Summit platform',
            contact: {
                name: 'API Support',
                email: 'support@example.com',
            },
        },
        servers: [
            {
                url: '/api',
                description: 'Main API Server',
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
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/routes/*.js'], // Path to the API docs
};
exports.openApiSpec = (0, swagger_jsdoc_1.default)(options);
