"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = __importDefault(require("ajv"));
const js_yaml_1 = require("js-yaml");
const fs_1 = __importDefault(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const ajv = new ajv_1.default({ allErrors: true, strict: false });
const oas = (0, js_yaml_1.load)(fs_1.default.readFileSync('api/openapi.yaml', 'utf8'));
it('GET /health matches schema', async () => {
    const res = await (0, node_fetch_1.default)(process.env.BASE_URL + '/health');
    const body = await res.json();
    const schema = oas.components.schemas.Health;
    const validate = ajv.compile(schema);
    expect(validate(body)).toBe(true);
});
