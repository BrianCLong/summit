"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
exports.default = (0, maestro_sdk_1.defineTask)({
    execute(_ctx, { payload }) {
        const ajv = new ajv_1.default({ allErrors: true });
        (0, ajv_formats_1.default)(ajv);
        const validate = ajv.compile(payload.schema);
        if (!validate(payload.data)) {
            throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors)}`);
        }
        return Promise.resolve({ payload: { valid: true } });
    },
});
