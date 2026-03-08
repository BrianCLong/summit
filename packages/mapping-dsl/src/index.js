"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.validateMapping = validateMapping;
const ajv_1 = __importDefault(require("ajv"));
const schema_json_1 = __importDefault(require("./schema.json"));
exports.schema = schema_json_1.default;
function validateMapping(mapping) {
    const ajv = new ajv_1.default({ allErrors: true });
    const validate = ajv.compile(schema_json_1.default);
    const valid = validate(mapping);
    return { valid, errors: validate.errors || [] };
}
