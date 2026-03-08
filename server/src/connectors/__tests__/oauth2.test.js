"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const encryptionKey = 'a'.repeat(64);
(0, globals_1.describe)('OAuth2PKCEClient', () => {
    (0, globals_1.beforeAll)(() => {
        process.env.NODE_ENV = 'test';
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
        process.env.NEO4J_URI = 'bolt://localhost:7687';
        process.env.NEO4J_USER = 'neo4j';
        process.env.NEO4J_PASSWORD = 'devpassword';
        process.env.JWT_SECRET = 'test-jwt-secret-should-be-32-chars-minimum';
        process.env.JWT_REFRESH_SECRET =
            'test-refresh-secret-should-be-32-chars-minimum';
        process.env.SESSION_SECRET =
            'test-session-secret-should-be-32-chars-minimum';
        process.env.ENCRYPTION_KEY = encryptionKey;
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetModules();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.restoreAllMocks();
    });
    (0, globals_1.it)('rotates refresh tokens and stores them encrypted', async () => {
        const { OAuth2PKCEClient } = await Promise.resolve().then(() => __importStar(require('../oauth2.js')));
        const { TokenVaultService } = await Promise.resolve().then(() => __importStar(require('../../services/TokenVaultService.js')));
        const vault = new TokenVaultService();
        const client = new OAuth2PKCEClient({
            clientId: 'client-id',
            clientSecret: 'client-secret',
            redirectUri: 'https://app.local/oauth/callback',
            authorizationEndpoint: 'https://accounts.example.com/auth',
            tokenEndpoint: 'https://accounts.example.com/token',
            scopes: ['scope.read'],
        }, vault);
        vault.storeTokens('connection-1', {
            accessToken: 'old-access',
            refreshToken: 'old-refresh',
            expiresAt: Date.now() + 1000,
            scope: 'scope.read',
            tokenType: 'Bearer',
        });
        const fetchMock = globals_1.jest.fn(async () => ({
            ok: true,
            json: async () => ({
                access_token: 'new-access',
                refresh_token: 'new-refresh',
                expires_in: 7200,
                scope: 'scope.read',
                token_type: 'Bearer',
            }),
            text: async () => '',
        }));
        globalThis.fetch = fetchMock;
        const tokens = await client.refreshTokens('connection-1');
        (0, globals_1.expect)(tokens.refreshToken).toBe('new-refresh');
        const stored = vault.getTokens('connection-1');
        (0, globals_1.expect)(stored?.refreshToken).toBe('new-refresh');
        (0, globals_1.expect)(fetchMock).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('stamps consent and terms metadata into connector events', async () => {
        const { BaseConnector } = await Promise.resolve().then(() => __importStar(require('../base.js')));
        class TestConnector extends BaseConnector {
            async connect() { }
            async disconnect() { }
            async testConnection() {
                return true;
            }
            async fetchSchema() {
                return { fields: [], version: 1 };
            }
            async readStream() {
                return null;
            }
            wrap(data) {
                return this.wrapEvent(data);
            }
        }
        const connector = new TestConnector({
            id: 'connector-1',
            name: 'Test Connector',
            type: 'test',
            tenantId: 'tenant-1',
            config: {},
            metadata: {
                consent: {
                    status: 'granted',
                    scopes: ['scope.read'],
                },
                termsUrl: 'https://intelgraph.local/terms',
            },
        });
        const event = connector.wrap({ hello: 'world' });
        (0, globals_1.expect)(event.provenance.consent?.status).toBe('granted');
        (0, globals_1.expect)(event.provenance.termsUrl).toBe('https://intelgraph.local/terms');
    });
});
