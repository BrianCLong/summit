"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 8080,
    postgres: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        user: process.env.POSTGRES_USER || 'user',
        password: process.env.POSTGRES_PASSWORD || 'password',
        database: process.env.POSTGRES_DB || 'deepagent',
    },
    neo4j: {
        uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
        user: process.env.NEO4J_USER || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password',
    },
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    auth: {
        jwksUri: process.env.JWKS_URI || 'https://your-auth-provider.com/.well-known/jwks.json',
        audience: process.env.JWT_AUDIENCE || 'your-api-audience',
        issuer: process.env.JWT_ISSUER || 'https://your-auth-provider.com/',
    }
};
