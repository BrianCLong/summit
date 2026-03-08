"use strict";
/**
 * Config Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
// Mock conf module (ESM-only package)
const mockStore = new Map();
jest.mock('conf', () => {
    return {
        __esModule: true,
        default: class MockConf {
            defaults;
            constructor(options) {
                this.defaults = options.defaults;
                mockStore.set('config', this.defaults);
            }
            get store() {
                return mockStore.get('config') ?? this.defaults;
            }
            set store(val) {
                mockStore.set('config', val);
            }
            get(key) {
                return this.store[key];
            }
            set(key, val) {
                const current = this.store;
                current[key] = val;
                mockStore.set('config', current);
            }
        },
    };
});
const config_js_1 = require("../src/lib/config.js");
(0, globals_1.describe)('Config', () => {
    let testDir;
    let originalEnv;
    (0, globals_1.beforeEach)(() => {
        testDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'cli-config-test-'));
        originalEnv = { ...process.env };
    });
    (0, globals_1.afterEach)(() => {
        node_fs_1.default.rmSync(testDir, { recursive: true, force: true });
        process.env = originalEnv;
    });
    (0, globals_1.describe)('loadConfig', () => {
        (0, globals_1.it)('should load default config when no file exists', async () => {
            const config = await (0, config_js_1.loadConfig)();
            (0, globals_1.expect)(config).toHaveProperty('defaultProfile');
            (0, globals_1.expect)(config).toHaveProperty('profiles');
            (0, globals_1.expect)(config.profiles).toHaveProperty('default');
        });
        (0, globals_1.it)('should load config from environment variables', async () => {
            process.env.NEO4J_URI = 'bolt://test:7687';
            process.env.NEO4J_USER = 'testuser';
            process.env.NEO4J_PASSWORD = 'testpass';
            const config = await (0, config_js_1.loadConfig)();
            const profile = (0, config_js_1.getProfile)(config);
            (0, globals_1.expect)(profile.neo4j?.uri).toBe('bolt://test:7687');
            (0, globals_1.expect)(profile.neo4j?.user).toBe('testuser');
            (0, globals_1.expect)(profile.neo4j?.password).toBe('testpass');
        });
        (0, globals_1.it)('should load config from DATABASE_URL', async () => {
            process.env.DATABASE_URL = 'postgres://user:pass@host:5433/dbname?sslmode=require';
            const config = await (0, config_js_1.loadConfig)();
            const profile = (0, config_js_1.getProfile)(config);
            (0, globals_1.expect)(profile.postgres?.host).toBe('host');
            (0, globals_1.expect)(profile.postgres?.port).toBe(5433);
            (0, globals_1.expect)(profile.postgres?.database).toBe('dbname');
            (0, globals_1.expect)(profile.postgres?.user).toBe('user');
            (0, globals_1.expect)(profile.postgres?.password).toBe('pass');
            (0, globals_1.expect)(profile.postgres?.ssl).toBe(true);
        });
    });
    (0, globals_1.describe)('getProfile', () => {
        (0, globals_1.it)('should return default profile when no name specified', () => {
            const config = {
                defaultProfile: 'default',
                profiles: {
                    default: {
                        neo4j: {
                            uri: 'bolt://localhost:7687',
                            user: 'neo4j',
                            database: 'neo4j',
                            encrypted: false,
                        },
                    },
                },
                telemetry: false,
            };
            const profile = (0, config_js_1.getProfile)(config);
            (0, globals_1.expect)(profile.neo4j?.uri).toBe('bolt://localhost:7687');
        });
        (0, globals_1.it)('should return named profile', () => {
            const config = {
                defaultProfile: 'default',
                profiles: {
                    default: {
                        neo4j: {
                            uri: 'bolt://localhost:7687',
                            user: 'neo4j',
                            database: 'neo4j',
                            encrypted: false,
                        },
                    },
                    production: {
                        neo4j: {
                            uri: 'bolt://prod:7687',
                            user: 'admin',
                            database: 'neo4j',
                            encrypted: true,
                        },
                    },
                },
                telemetry: false,
            };
            const profile = (0, config_js_1.getProfile)(config, 'production');
            (0, globals_1.expect)(profile.neo4j?.uri).toBe('bolt://prod:7687');
            (0, globals_1.expect)(profile.neo4j?.encrypted).toBe(true);
        });
        (0, globals_1.it)('should return empty object for non-existent profile', () => {
            const config = {
                defaultProfile: 'default',
                profiles: {},
                telemetry: false,
            };
            const profile = (0, config_js_1.getProfile)(config, 'nonexistent');
            (0, globals_1.expect)(profile).toEqual({});
        });
    });
});
