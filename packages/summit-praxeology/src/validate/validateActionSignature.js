"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateActionSignature = validateActionSignature;
const ajv_1 = require("./ajv");
function validateActionSignature(actionSignature) {
    const ajv = (0, ajv_1.makeAjv)();
    const validate = ajv.getSchema('https://summit.dev/schemas/pg.action.schema.json');
    if (!validate) {
        throw new Error('AJV schema not registered: pg.action.schema.json');
    }
    const okSchema = validate(actionSignature);
    const schemaErrors = (validate.errors ?? []).map((error) => ({
        message: error.message ?? 'schema validation error',
        instancePath: error.instancePath,
        schemaPath: error.schemaPath
    }));
    const ok = Boolean(okSchema);
    return {
        ok,
        schemaErrors
    };
}
