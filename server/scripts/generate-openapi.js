"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const openapi_js_1 = require("../src/services/openapi.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Output to server/public/openapi.json
const outputPath = path_1.default.resolve(__dirname, '../public/openapi.json');
// Ensure directory exists
const dir = path_1.default.dirname(outputPath);
if (!fs_1.default.existsSync(dir)) {
    fs_1.default.mkdirSync(dir, { recursive: true });
}
fs_1.default.writeFileSync(outputPath, JSON.stringify(openapi_js_1.openApiSpec, null, 2));
console.log(`OpenAPI spec generated at ${outputPath}`);
