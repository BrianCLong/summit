"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlaybook = validatePlaybook;
const ajv_1 = require("./ajv");
const semanticRules_1 = require("../sv/semanticRules");
function validatePlaybook(playbook) {
    const ajv = (0, ajv_1.makeAjv)();
    const validate = ajv.getSchema('https://summit.dev/schemas/pg.playbook.schema.json');
    if (!validate) {
        throw new Error('AJV schema not registered: pg.playbook.schema.json');
    }
    const okSchema = validate(playbook);
    const schemaErrors = (validate.errors ?? []).map((error) => ({
        message: error.message ?? 'schema validation error',
        instancePath: error.instancePath,
        schemaPath: error.schemaPath
    }));
    const semanticViolations = (0, semanticRules_1.validatePlaybookSemantics)(playbook);
    const ok = Boolean(okSchema) && semanticViolations.length === 0;
    return {
        ok,
        schemaErrors,
        semanticViolations
    };
}
