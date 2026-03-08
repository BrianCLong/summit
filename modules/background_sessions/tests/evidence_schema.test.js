"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const promises_1 = require("fs/promises");
const path_1 = require("path");
const url_1 = require("url");
const testDir = (0, path_1.dirname)((0, url_1.fileURLToPath)(import.meta.url));
const loadJson = async (relativePath) => {
    const filePath = (0, path_1.join)(testDir, relativePath);
    const raw = await (0, promises_1.readFile)(filePath, 'utf8');
    return JSON.parse(raw);
};
describe('background sessions evidence schemas', () => {
    const ajv = new ajv_1.default({ allErrors: true, strict: false });
    (0, ajv_formats_1.default)(ajv);
    const cases = [
        {
            schemaFile: '../evidence/schemas/index.schema.json',
            validFixture: './fixtures/index.valid.json',
            invalidFixture: './fixtures/index.invalid.json',
        },
        {
            schemaFile: '../evidence/schemas/report.schema.json',
            validFixture: './fixtures/report.valid.json',
            invalidFixture: './fixtures/report.invalid.json',
        },
        {
            schemaFile: '../evidence/schemas/metrics.schema.json',
            validFixture: './fixtures/metrics.valid.json',
            invalidFixture: './fixtures/metrics.invalid.json',
        },
        {
            schemaFile: '../evidence/schemas/stamp.schema.json',
            validFixture: './fixtures/stamp.valid.json',
            invalidFixture: './fixtures/stamp.invalid.json',
        },
    ];
    test.each(cases)('validates %s fixtures', async ({ schemaFile, validFixture, invalidFixture, }) => {
        const schema = await loadJson(schemaFile);
        const validate = ajv.compile(schema);
        const validData = await loadJson(validFixture);
        const invalidData = await loadJson(invalidFixture);
        expect(validate(validData)).toBe(true);
        expect(validate(invalidData)).toBe(false);
    });
});
