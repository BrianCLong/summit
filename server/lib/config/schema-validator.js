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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validator = exports.SchemaValidator = void 0;
const _2020_1 = __importDefault(require("ajv/dist/2020"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
class SchemaValidator {
    ajv;
    schemas = new Map();
    secretManager;
    constructor(secretManager) {
        this.secretManager = secretManager;
        this.ajv = new _2020_1.default({ allErrors: true, strict: false });
        (0, ajv_formats_1.default)(this.ajv);
        this.loadSchemas();
    }
    loadSchemas() {
        const schemaDir = path.resolve(process.cwd(), 'config/schema');
        if (!fs.existsSync(schemaDir)) {
            return;
        }
        const schemaFiles = fs
            .readdirSync(schemaDir)
            .filter((file) => file.match(/\.schema\.(json|ya?ml)$/));
        for (const file of schemaFiles) {
            const schemaName = path.basename(file).replace(/\.schema\.(json|ya?ml)$/i, '');
            const schemaPath = path.join(schemaDir, file);
            const rawSchema = fs.readFileSync(schemaPath, 'utf-8');
            const schema = file.endsWith('.json') ? JSON.parse(rawSchema) : yaml.load(rawSchema);
            const schemaId = schema.$id || schemaName;
            this.schemas.set(schemaName, schemaId);
            this.ajv.addSchema(schema, schemaId);
        }
    }
    validate(config, schemaName) {
        const interpolatedConfig = this.interpolate(config);
        const resolvedConfig = this.secretManager?.resolveConfig(interpolatedConfig) ?? this.resolveSecrets(interpolatedConfig);
        const validate = this.getValidator(schemaName);
        if (!validate) {
            throw new Error(`Schema ${schemaName} not found.`);
        }
        if (!validate(resolvedConfig)) {
            throw new Error(this.formatErrors(validate.errors));
        }
        return resolvedConfig;
    }
    getValidator(schemaName) {
        const schemaId = this.schemas.get(schemaName) ?? schemaName;
        return this.ajv.getSchema(schemaId) ?? this.ajv.getSchema(schemaName);
    }
    interpolate(config) {
        const configString = JSON.stringify(config);
        const interpolatedString = configString.replace(/\${(.*?)}/g, (_, envVar) => {
            const value = process.env[envVar];
            if (value === undefined) {
                throw new Error(`Environment variable ${envVar} not set.`);
            }
            return value;
        });
        return JSON.parse(interpolatedString);
    }
    resolveSecrets(config) {
        const configString = JSON.stringify(config);
        const resolvedString = configString.replace(/"aws-ssm:(.*?)"/g, (_, secretPath) => {
            // In a real implementation, you would fetch this from AWS SSM.
            // For this example, we'll use a dummy value.
            console.log(`Resolving secret from AWS SSM: ${secretPath}`);
            return `"resolved-${secretPath.split('/').pop()}"`;
        });
        return JSON.parse(resolvedString);
    }
    formatErrors(errors) {
        if (!errors) {
            return 'Unknown validation error';
        }
        return errors.map(error => `  - ${error.instancePath} ${error.message}`).join('\n');
    }
}
exports.SchemaValidator = SchemaValidator;
exports.validator = new SchemaValidator();
