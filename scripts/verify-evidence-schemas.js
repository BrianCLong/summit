"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const _2020_js_1 = __importDefault(require("ajv/dist/2020.js"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const rootDir = path_1.default.resolve(__dirname, '..');
const schemasDir = path_1.default.join(rootDir, 'docs/api/schemas/evidence');
const ajv = new _2020_js_1.default({ strict: false });
(0, ajv_formats_1.default)(ajv);
if (!fs_1.default.existsSync(schemasDir)) {
    console.error(`Schemas directory not found: ${schemasDir}`);
    process.exit(1);
}
const schemaFiles = fs_1.default.readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'));
const schemas = {};
console.log(`Found ${schemaFiles.length} schemas in ${schemasDir}`);
let hasError = false;
// 1. Compile Schemas
for (const file of schemaFiles) {
    const schemaPath = path_1.default.join(schemasDir, file);
    try {
        const schemaContent = fs_1.default.readFileSync(schemaPath, 'utf-8');
        const schema = JSON.parse(schemaContent);
        ajv.addSchema(schema); // adds by $id
        schemas[file] = schema;
        console.log(`✅ ${file} compiled successfully`);
    }
    catch (e) {
        console.error(`❌ ${file} failed compilation: `, e);
        hasError = true;
    }
}
// 2. Validate Fixtures
const fixturesDir = path_1.default.join(rootDir, 'server/tests/fixtures/evidence');
function validateFixture(filePath, expectedValid) {
    const fileName = path_1.default.basename(filePath);
    try {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        let schemaName = '';
        if (fileName.includes('report'))
            schemaName = 'report.schema.json';
        else if (fileName.includes('metrics'))
            schemaName = 'metrics.schema.json';
        else if (fileName.includes('stamp'))
            schemaName = 'stamp.schema.json';
        else if (fileName.includes('index'))
            schemaName = 'index.schema.json';
        if (!schemaName || !schemas[schemaName]) {
            console.warn(`⚠️ Skipping fixture ${fileName} (no matching schema found)`);
            return;
        }
        const schemaId = schemas[schemaName].$id;
        const validate = ajv.getSchema(schemaId);
        if (!validate) {
            console.error(`❌ Could not retrieve compiled schema for ${schemaName}`);
            hasError = true;
            return;
        }
        const valid = validate(data);
        if (expectedValid) {
            if (!valid) {
                console.error(`❌ Positive fixture ${fileName} failed validation:`, validate.errors);
                hasError = true;
            }
            else {
                console.log(`✅ Positive fixture ${fileName} passed`);
            }
        }
        else {
            if (valid) {
                console.error(`❌ Negative fixture ${fileName} unexpectedly passed validation`);
                hasError = true;
            }
            else {
                console.log(`✅ Negative fixture ${fileName} failed as expected`);
            }
        }
    }
    catch (e) {
        console.error(`❌ Error processing fixture ${fileName}: `, e);
        hasError = true;
    }
}
if (fs_1.default.existsSync(fixturesDir)) {
    const positiveDir = path_1.default.join(fixturesDir, 'positive');
    const negativeDir = path_1.default.join(fixturesDir, 'negative');
    if (fs_1.default.existsSync(positiveDir)) {
        fs_1.default.readdirSync(positiveDir).filter(f => f.endsWith('.json')).forEach(f => {
            validateFixture(path_1.default.join(positiveDir, f), true);
        });
    }
    if (fs_1.default.existsSync(negativeDir)) {
        fs_1.default.readdirSync(negativeDir).filter(f => f.endsWith('.json')).forEach(f => {
            validateFixture(path_1.default.join(negativeDir, f), false);
        });
    }
}
else {
    console.log('No fixtures found, skipping validation.');
}
if (hasError) {
    process.exit(1);
}
