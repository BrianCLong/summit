"use strict";
/**
 * CLI Configuration Management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.getProfile = getProfile;
exports.saveConfig = saveConfig;
exports.setProfileValue = setProfileValue;
exports.getConfigPath = getConfigPath;
const conf_1 = __importDefault(require("conf"));
const zod_1 = require("zod");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const yaml_1 = __importDefault(require("yaml"));
const constants_js_1 = require("./constants.js");
const Neo4jConfigSchema = zod_1.z.object({
    uri: zod_1.z.string().default(constants_js_1.DEFAULT_NEO4J_URI),
    user: zod_1.z.string().default(constants_js_1.DEFAULT_NEO4J_USER),
    password: zod_1.z.string().optional(),
    database: zod_1.z.string().default('neo4j'),
    encrypted: zod_1.z.boolean().default(false),
});
const PostgresConfigSchema = zod_1.z.object({
    host: zod_1.z.string().default(constants_js_1.DEFAULT_POSTGRES_HOST),
    port: zod_1.z.number().default(constants_js_1.DEFAULT_POSTGRES_PORT),
    database: zod_1.z.string().default(constants_js_1.DEFAULT_POSTGRES_DB),
    user: zod_1.z.string().optional(),
    password: zod_1.z.string().optional(),
    ssl: zod_1.z.boolean().default(false),
});
const AgentConfigSchema = zod_1.z.object({
    endpoint: zod_1.z.string().optional(),
    apiKey: zod_1.z.string().optional(),
    timeout: zod_1.z.number().default(30000),
    maxConcurrent: zod_1.z.number().default(5),
});
const ExportConfigSchema = zod_1.z.object({
    outputDir: zod_1.z.string().default('./exports'),
    compression: zod_1.z.boolean().default(true),
    signExports: zod_1.z.boolean().default(false),
    privateKeyPath: zod_1.z.string().optional(),
});
const ProfileSchema = zod_1.z.object({
    neo4j: Neo4jConfigSchema.optional(),
    postgres: PostgresConfigSchema.optional(),
    agent: AgentConfigSchema.optional(),
    export: ExportConfigSchema.optional(),
});
const CLIConfigSchema = zod_1.z.object({
    defaultProfile: zod_1.z.string().default('default'),
    profiles: zod_1.z.record(zod_1.z.string(), ProfileSchema).default({}),
    telemetry: zod_1.z.boolean().default(false),
});
const configStore = new conf_1.default({
    projectName: 'intelgraph-cli',
    defaults: {
        defaultProfile: 'default',
        profiles: {
            default: {
                neo4j: Neo4jConfigSchema.parse({}),
                postgres: PostgresConfigSchema.parse({}),
                agent: AgentConfigSchema.parse({}),
                export: ExportConfigSchema.parse({}),
            },
        },
        telemetry: false,
    },
});
async function loadConfig(configPath) {
    // Priority: CLI arg > env var > local file > home dir > defaults
    const paths = [
        configPath,
        process.env.INTELGRAPH_CONFIG,
        node_path_1.default.join(process.cwd(), constants_js_1.CONFIG_FILE_NAME),
        node_path_1.default.join(process.cwd(), `${constants_js_1.CONFIG_FILE_NAME}.yaml`),
        node_path_1.default.join(process.cwd(), `${constants_js_1.CONFIG_FILE_NAME}.yml`),
        node_path_1.default.join(node_os_1.default.homedir(), constants_js_1.CONFIG_DIR, 'config.yaml'),
        node_path_1.default.join(node_os_1.default.homedir(), constants_js_1.CONFIG_DIR, 'config.yml'),
        node_path_1.default.join(node_os_1.default.homedir(), constants_js_1.CONFIG_FILE_NAME),
    ].filter(Boolean);
    for (const filePath of paths) {
        if (node_fs_1.default.existsSync(filePath)) {
            try {
                const content = node_fs_1.default.readFileSync(filePath, 'utf-8');
                const parsed = filePath.endsWith('.json')
                    ? JSON.parse(content)
                    : yaml_1.default.parse(content);
                return CLIConfigSchema.parse(parsed);
            }
            catch {
                // Continue to next path
            }
        }
    }
    // Load from environment variables
    const envConfig = loadEnvConfig();
    if (Object.keys(envConfig).length > 0) {
        const merged = mergeConfigs(configStore.store, envConfig);
        return CLIConfigSchema.parse(merged);
    }
    return configStore.store;
}
function loadEnvConfig() {
    const config = {
        profiles: {
            default: {},
        },
    };
    // Neo4j from environment
    if (process.env.NEO4J_URI || process.env.NEO4J_USER || process.env.NEO4J_PASSWORD) {
        config.profiles.default.neo4j = {
            uri: process.env.NEO4J_URI || constants_js_1.DEFAULT_NEO4J_URI,
            user: process.env.NEO4J_USER || constants_js_1.DEFAULT_NEO4J_USER,
            password: process.env.NEO4J_PASSWORD,
            database: process.env.NEO4J_DATABASE || 'neo4j',
            encrypted: process.env.NEO4J_ENCRYPTED === 'true',
        };
    }
    // PostgreSQL from environment
    if (process.env.PGHOST ||
        process.env.PGUSER ||
        process.env.PGPASSWORD ||
        process.env.DATABASE_URL) {
        if (process.env.DATABASE_URL) {
            const url = new URL(process.env.DATABASE_URL);
            config.profiles.default.postgres = {
                host: url.hostname,
                port: parseInt(url.port || '5432'),
                database: url.pathname.slice(1),
                user: url.username,
                password: url.password,
                ssl: url.searchParams.get('sslmode') === 'require',
            };
        }
        else {
            config.profiles.default.postgres = {
                host: process.env.PGHOST || constants_js_1.DEFAULT_POSTGRES_HOST,
                port: parseInt(process.env.PGPORT || String(constants_js_1.DEFAULT_POSTGRES_PORT)),
                database: process.env.PGDATABASE || constants_js_1.DEFAULT_POSTGRES_DB,
                user: process.env.PGUSER,
                password: process.env.PGPASSWORD,
                ssl: process.env.PGSSLMODE === 'require',
            };
        }
    }
    // Agent from environment
    if (process.env.AGENT_ENDPOINT || process.env.AGENT_API_KEY) {
        config.profiles.default.agent = {
            endpoint: process.env.AGENT_ENDPOINT,
            apiKey: process.env.AGENT_API_KEY,
            timeout: parseInt(process.env.AGENT_TIMEOUT || '30000'),
            maxConcurrent: parseInt(process.env.AGENT_MAX_CONCURRENT || '5'),
        };
    }
    return config;
}
function mergeConfigs(base, override) {
    return {
        ...base,
        ...override,
        profiles: {
            ...base.profiles,
            ...override.profiles,
        },
    };
}
function getProfile(config, profileName) {
    const name = profileName || config.defaultProfile;
    return config.profiles[name] || config.profiles.default || {};
}
function saveConfig(config) {
    configStore.set(config);
}
function setProfileValue(profileName, key, value) {
    const profiles = configStore.get('profiles') || {};
    const profile = profiles[profileName] || {};
    const keys = key.split('.');
    let current = profile;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    profiles[profileName] = profile;
    configStore.set('profiles', profiles);
}
function getConfigPath() {
    return configStore.path;
}
