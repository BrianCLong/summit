"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const _2020_js_1 = __importDefault(require("ajv/dist/2020.js"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const ajv = new _2020_js_1.default({ allErrors: true, strict: false });
(0, ajv_formats_1.default)(ajv);
async function loadJson(relativePath) {
    const raw = await (0, promises_1.readFile)(node_path_1.default.join(process.cwd(), relativePath), "utf8");
    return JSON.parse(raw);
}
describe("evidence schemas", () => {
    const cases = [
        ["index", "docs/api/schemas/evidence/index.schema.json"],
        ["report", "docs/api/schemas/evidence/report.schema.json"],
        ["metrics", "docs/api/schemas/evidence/metrics.schema.json"],
        ["stamp", "docs/api/schemas/evidence/stamp.schema.json"],
    ];
    it.each(cases)("accepts positive fixture for %s", async (_name, schemaPath) => {
        const schema = await loadJson(schemaPath);
        const fixture = await loadJson(`tests/fixtures/evidence/positive/${node_path_1.default.basename(schemaPath).replace(".schema", "")}`);
        const validate = ajv.compile(schema);
        expect(validate(fixture)).toBe(true);
    });
    it.each(cases)("rejects negative fixture for %s", async (_name, schemaPath) => {
        const schema = await loadJson(schemaPath);
        const fixture = await loadJson(`tests/fixtures/evidence/negative/${node_path_1.default.basename(schemaPath).replace(".schema", "")}`);
        const validate = ajv.compile(schema);
        expect(validate(fixture)).toBe(false);
    });
});
