"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAjv = makeAjv;
const _2020_1 = __importDefault(require("ajv/dist/2020"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const pg_action_schema_json_1 = __importDefault(require("../schemas/pg.action.schema.json"));
const pg_playbook_schema_json_1 = __importDefault(require("../schemas/pg.playbook.schema.json"));
const pg_hypothesis_schema_json_1 = __importDefault(require("../schemas/pg.hypothesis.schema.json"));
function makeAjv() {
    const ajv = new _2020_1.default({
        allErrors: true,
        strict: true
    });
    (0, ajv_formats_1.default)(ajv);
    ajv.addSchema(pg_action_schema_json_1.default);
    ajv.addSchema(pg_playbook_schema_json_1.default);
    ajv.addSchema(pg_hypothesis_schema_json_1.default);
    return ajv;
}
