"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_js_1 = require("../src/config/swagger.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const rootDir = path_1.default.resolve(__dirname, '..');
async function validateAndGenerate() {
    console.log('Validating OpenAPI Spec...');
    try {
        // Basic validation: Check if spec is an object and has required fields
        if (!swagger_js_1.swaggerSpec || typeof swagger_js_1.swaggerSpec !== 'object') {
            throw new Error('Swagger spec is not a valid object');
        }
        if (!swagger_js_1.swaggerSpec.openapi || !swagger_js_1.swaggerSpec.openapi.startsWith('3.')) {
            throw new Error('Swagger spec is missing openapi 3.x version');
        }
        if (!swagger_js_1.swaggerSpec.info || !swagger_js_1.swaggerSpec.info.title || !swagger_js_1.swaggerSpec.info.version) {
            throw new Error('Swagger spec is missing required info fields');
        }
        if (!swagger_js_1.swaggerSpec.paths || Object.keys(swagger_js_1.swaggerSpec.paths).length === 0) {
            console.warn('Warning: No paths found in Swagger spec. Check if routes are correctly scanned.');
        }
        console.log('Spec passed basic validation.');
        // Generate JSON file
        const jsonPath = path_1.default.join(rootDir, 'openapi.json');
        fs_1.default.writeFileSync(jsonPath, JSON.stringify(swagger_js_1.swaggerSpec, null, 2));
        console.log(`Generated OpenAPI JSON at ${jsonPath}`);
        // Generate YAML file (simple conversion for now, or just use JSON)
        // For now, we stick to JSON as it's the native output of swagger-jsdoc
        console.log('Documentation generation complete.');
        process.exit(0);
    }
    catch (error) {
        console.error('Validation/Generation failed:', error);
        process.exit(1);
    }
}
validateAndGenerate();
