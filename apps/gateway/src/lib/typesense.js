"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typesenseClient = void 0;
const typesense_1 = require("typesense");
exports.typesenseClient = new typesense_1.Client({
    nodes: [
        {
            host: process.env.TYPESENSE_HOST || 'localhost',
            port: parseInt(process.env.TYPESENSE_PORT || '8108'),
            protocol: process.env.TYPESENSE_PROTOCOL || 'http',
        },
    ],
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
    connectionTimeoutSeconds: 5,
    numRetries: 3,
    retryIntervalSeconds: 0.1,
});
