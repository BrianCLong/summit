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
// @ts-nocheck
const dotenv = __importStar(require("dotenv"));
const schema_js_1 = require("./schema.js");
const load_js_1 = require("./load.js");
dotenv.config();
// Load and validate config using JSON Schema (AJV) first
// This handles strict validation based on CONFIG_VALIDATE_ON_START
const rawConfig = (0, load_js_1.loadConfig)();
let config;
// Always validate config to apply defaults and type coercion via Zod
// This ensures the Config type is strictly adhered to for the application
// However, if strict validation is disabled (via flag), we should attempt to proceed even if Zod complains,
// provided we can fallback or accept the risk. BUT, Zod is used for type coercion (string -> number).
// If Zod fails, we likely have garbage data.
// So we use safeParse.
const result = schema_js_1.ConfigSchema.safeParse(rawConfig);
if (!result.success) {
    const strict = process.env.CONFIG_VALIDATE_ON_START === 'true';
    const errors = result.error.format();
    if (strict) {
        console.error('❌ Invalid Configuration (Zod validation):', errors);
        process.exit(1);
    }
    else {
        console.warn('⚠️ Invalid Configuration detected by Zod (Non-strict mode). proceeding with potentially unstable config:', errors);
        // In non-strict mode, we might want to return the raw config casted,
        // OR try to use partial data?
        // Since existing code expects a fully typed Config object with defaults,
        // and ConfigSchema applies those defaults, a failure here means even defaults failed
        // (e.g. invalid type that couldn't be coerced).
        // If we proceed, we must provide *something*.
        // We'll return the rawConfig casted as Config, but this is dangerous.
        // However, "Does not break runtime by default" implies we shouldn't crash if we can avoid it.
        config = rawConfig;
    }
}
else {
    config = result.data;
}
if (config.requireRealDbs || config.env === 'production') {
    const devPasswords = [
        'devpassword',
        'dev_jwt_secret_12345',
        'dev_refresh_secret_67890',
    ];
    // Check if config.neo4j exists before accessing (in case of non-strict bypass above)
    if (config.neo4j && config.postgres && config.jwt && config.redis) {
        if (devPasswords.includes(config.neo4j.password) ||
            devPasswords.includes(config.postgres.password) ||
            devPasswords.includes(config.jwt.secret) ||
            devPasswords.includes(config.redis.password) ||
            devPasswords.includes(config.jwt.refreshSecret)) {
            console.error('❌ Production/RealDBs mode security violations found.');
            process.exit(1);
        }
    }
}
exports.default = config;
