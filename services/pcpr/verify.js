"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = verify;
const ajv_1 = __importDefault(require("ajv"));
const pcpr_schema_json_1 = __importDefault(require("./pcpr.schema.json"));
const ajv = new ajv_1.default({ allErrors: true });
const validate = ajv.compile(pcpr_schema_json_1.default);
function verify(ob) {
    if (!validate(ob))
        throw new Error('PCPR fail: ' + JSON.stringify(validate.errors));
    return true;
}
