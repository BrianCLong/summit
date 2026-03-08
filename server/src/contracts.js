"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateArtifact = validateArtifact;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fs_1 = require("fs");
const Ajv = ajv_1.default.default || ajv_1.default;
const addFormats = ajv_formats_1.default.default || ajv_formats_1.default;
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
async function validateArtifact(contractPath, artifact) {
    const raw = await fs_1.promises.readFile(contractPath, 'utf8');
    const schema = JSON.parse(raw);
    const validate = ajv.compile(schema);
    const ok = validate(artifact);
    return ok
        ? { ok: true, errors: [] }
        : {
            ok: false,
            errors: (validate.errors || []).map((e) => `${e.instancePath} ${e.message}`),
        };
}
