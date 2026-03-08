"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const openApiSpecPath = path_1.default.resolve(__dirname, '../public/openapi.json');
const outputDir = path_1.default.resolve(__dirname, '../../clients');
const languages = ['typescript-axios', 'python'];
// Ensure spec exists
require("./generate-openapi.js");
console.log('Generating API clients...');
languages.forEach((lang) => {
    const langOutputDir = path_1.default.join(outputDir, lang);
    console.log(`Generating ${lang} client in ${langOutputDir}...`);
    try {
        // Using openapi-generator-cli via npx
        // Note: This requires java to be installed in the environment
        const command = `npx @openapitools/openapi-generator-cli generate -i ${openApiSpecPath} -g ${lang} -o ${langOutputDir} --additional-properties=npmName=@intelgraph/client-${lang}`;
        (0, child_process_1.execSync)(command, { stdio: 'inherit' });
        console.log(`Successfully generated ${lang} client.`);
    }
    catch (error) {
        console.error(`Failed to generate ${lang} client:`, error);
        // Do not exit process, try next language
    }
});
