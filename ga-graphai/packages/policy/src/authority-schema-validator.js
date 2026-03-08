"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAuthoritySchema = validateAuthoritySchema;
exports.loadAuthoritySchemaFromFile = loadAuthoritySchemaFromFile;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = __importDefault(require("yaml"));
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function assertString(field, pathLabel, errors) {
    if (!isNonEmptyString(field)) {
        errors.push(`${pathLabel} must be a non-empty string`);
    }
}
function assertArray(field, pathLabel, errors) {
    if (!Array.isArray(field)) {
        errors.push(`${pathLabel} must be an array`);
        return false;
    }
    return true;
}
function validateAttributeDefinition(def, scope, errors) {
    assertString(def.key, `${scope}.key`, errors);
    if (!isNonEmptyString(def.type)) {
        errors.push(`${scope}.type must be a non-empty string`);
    }
    else if (!['string', 'enum', 'integer', 'object', 'array', 'boolean'].includes(def.type)) {
        errors.push(`${scope}.type must be one of string, enum, integer, object, array, boolean`);
    }
    if (def.type === 'enum') {
        if (!def.allowed || !Array.isArray(def.allowed) || def.allowed.length === 0) {
            errors.push(`${scope}.allowed is required for enum attributes`);
        }
    }
}
function validateAttributeCatalog(catalog, errors) {
    const scopes = ['principal', 'resource', 'context'];
    scopes.forEach((scopeKey) => {
        const definitions = catalog[scopeKey];
        if (!definitions) {
            return;
        }
        if (!Array.isArray(definitions)) {
            errors.push(`attribute_catalog.${scopeKey} must be an array`);
            return;
        }
        definitions.forEach((def, index) => {
            validateAttributeDefinition(def, `attribute_catalog.${scopeKey}[${index}]`, errors);
        });
    });
}
function validateGrant(grant, scope, errors) {
    if (!['allow', 'deny'].includes(grant.effect)) {
        errors.push(`${scope}.effect must be allow or deny`);
    }
    if (assertArray(grant.actions, `${scope}.actions`, errors)) {
        if (grant.actions.length === 0) {
            errors.push(`${scope}.actions must include at least one action`);
        }
    }
    if (assertArray(grant.resources, `${scope}.resources`, errors)) {
        if (grant.resources.length === 0) {
            errors.push(`${scope}.resources must include at least one resource`);
        }
    }
}
function validateTemplateCondition(condition, scope, errors) {
    assertString(condition.expression, `${scope}.expression`, errors);
    if (condition.based_on !== undefined) {
        if (assertArray(condition.based_on, `${scope}.based_on`, errors)) {
            condition.based_on.forEach((value, idx) => {
                assertString(value, `${scope}.based_on[${idx}]`, errors);
            });
        }
    }
}
function validateRoleTemplate(template, scope, errors) {
    assertString(template.id, `${scope}.id`, errors);
    assertString(template.description, `${scope}.description`, errors);
    if (!Array.isArray(template.grants) || template.grants.length === 0) {
        errors.push(`${scope}.grants must include at least one grant`);
    }
    else {
        template.grants.forEach((grant, index) => {
            validateGrant(grant, `${scope}.grants[${index}]`, errors);
        });
    }
    if (template.conditions) {
        if (!Array.isArray(template.conditions)) {
            errors.push(`${scope}.conditions must be an array when provided`);
        }
        else {
            template.conditions.forEach((condition, index) => {
                validateTemplateCondition(condition, `${scope}.conditions[${index}]`, errors);
            });
        }
    }
    if (template.obligations) {
        if (!Array.isArray(template.obligations)) {
            errors.push(`${scope}.obligations must be an array when provided`);
        }
        else {
            template.obligations.forEach((obligation, index) => {
                assertString(obligation.type, `${scope}.obligations[${index}].type`, errors);
            });
        }
    }
}
function validateBinding(binding, scope, errors) {
    assertString(binding.template, `${scope}.template`, errors);
    if (typeof binding.with !== 'object' || binding.with === null) {
        errors.push(`${scope}.with must be an object`);
    }
    if (!Array.isArray(binding.subjects) || binding.subjects.length === 0) {
        errors.push(`${scope}.subjects must include at least one subject`);
    }
    else {
        binding.subjects.forEach((subject, index) => {
            assertString(subject.type, `${scope}.subjects[${index}].type`, errors);
            assertString(subject.id, `${scope}.subjects[${index}].id`, errors);
        });
    }
    if (binding.conditions) {
        if (!Array.isArray(binding.conditions)) {
            errors.push(`${scope}.conditions must be an array when provided`);
        }
        else {
            binding.conditions.forEach((condition, index) => {
                validateTemplateCondition(condition, `${scope}.conditions[${index}]`, errors);
            });
        }
    }
}
function validateAbacControl(control, scope, errors) {
    assertString(control.expression, `${scope}.expression`, errors);
    if (!['allow', 'deny'].includes(control.effect)) {
        errors.push(`${scope}.effect must be allow or deny`);
    }
    if (control.when !== undefined) {
        if (assertArray(control.when, `${scope}.when`, errors)) {
            control.when.forEach((condition, index) => {
                assertString(condition, `${scope}.when[${index}]`, errors);
            });
        }
    }
}
function validateAuthority(authority, scope, errors) {
    assertString(authority.id, `${scope}.id`, errors);
    assertString(authority.description, `${scope}.description`, errors);
    if (!['permit-overrides', 'deny-overrides', 'first-applicable'].includes(authority.decision_strategy)) {
        errors.push(`${scope}.decision_strategy must be permit-overrides, deny-overrides, or first-applicable`);
    }
    if (!Array.isArray(authority.inherits)) {
        errors.push(`${scope}.inherits must be an array`);
    }
    if (!Array.isArray(authority.bindings) || authority.bindings.length === 0) {
        errors.push(`${scope}.bindings must include at least one binding`);
    }
    else {
        authority.bindings.forEach((binding, index) => {
            validateBinding(binding, `${scope}.bindings[${index}]`, errors);
        });
    }
    if (authority.abac_controls) {
        if (!Array.isArray(authority.abac_controls)) {
            errors.push(`${scope}.abac_controls must be an array when provided`);
        }
        else {
            authority.abac_controls.forEach((control, index) => {
                validateAbacControl(control, `${scope}.abac_controls[${index}]`, errors);
            });
        }
    }
}
function validateInheritanceRules(rules, scope, errors) {
    if (rules.precedence &&
        !['child-overrides', 'parent-overrides'].includes(rules.precedence)) {
        errors.push(`${scope}.precedence must be child-overrides or parent-overrides`);
    }
    if (rules.merge_strategy) {
        const { merge_strategy: strategy } = rules;
        if (strategy.grants && !['append', 'replace'].includes(strategy.grants)) {
            errors.push(`${scope}.merge_strategy.grants must be append or replace`);
        }
        if (strategy.obligations &&
            !['append', 'replace'].includes(strategy.obligations)) {
            errors.push(`${scope}.merge_strategy.obligations must be append or replace`);
        }
        if (strategy.conditions &&
            !['and', 'or', 'replace'].includes(strategy.conditions)) {
            errors.push(`${scope}.merge_strategy.conditions must be and, or, or replace`);
        }
    }
}
function validateAuthoritySchema(schemaCandidate) {
    const errors = [];
    const warnings = [];
    if (typeof schemaCandidate !== 'object' || schemaCandidate === null) {
        return { valid: false, errors: ['Schema must be an object'], warnings };
    }
    const schema = schemaCandidate;
    assertString(schema.schema_version, 'schema_version', errors);
    if (!schema.metadata || typeof schema.metadata !== 'object') {
        errors.push('metadata must be provided and be an object');
    }
    else {
        assertString(schema.metadata.namespace, 'metadata.namespace', errors);
        assertString(schema.metadata.owner, 'metadata.owner', errors);
        if (schema.metadata.description !== undefined) {
            assertString(schema.metadata.description, 'metadata.description', errors);
        }
    }
    if (!schema.condition_language || typeof schema.condition_language !== 'object') {
        errors.push('condition_language must be provided');
    }
    else {
        assertString(schema.condition_language.syntax, 'condition_language.syntax', errors);
        if (schema.condition_language.description !== undefined) {
            assertString(schema.condition_language.description, 'condition_language.description', errors);
        }
    }
    if (!schema.attribute_catalog || typeof schema.attribute_catalog !== 'object') {
        errors.push('attribute_catalog must be provided and be an object');
    }
    else {
        validateAttributeCatalog(schema.attribute_catalog, errors);
    }
    if (!Array.isArray(schema.role_templates) || schema.role_templates.length === 0) {
        errors.push('role_templates must include at least one template');
    }
    else {
        schema.role_templates.forEach((template, index) => {
            validateRoleTemplate(template, `role_templates[${index}]`, errors);
        });
    }
    if (!Array.isArray(schema.authorities) || schema.authorities.length === 0) {
        errors.push('authorities must include at least one authority');
    }
    else {
        schema.authorities.forEach((authority, index) => {
            validateAuthority(authority, `authorities[${index}]`, errors);
        });
    }
    if (schema.inheritance_rules) {
        validateInheritanceRules(schema.inheritance_rules, 'inheritance_rules', errors);
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        schema,
    };
}
function loadAuthoritySchemaFromFile(filePath) {
    const fullPath = node_path_1.default.resolve(filePath);
    if (!node_fs_1.default.existsSync(fullPath)) {
        return {
            valid: false,
            errors: [`Schema file not found at ${fullPath}`],
            warnings: [],
        };
    }
    try {
        const raw = node_fs_1.default.readFileSync(fullPath, 'utf8');
        const parsed = yaml_1.default.parse(raw);
        return validateAuthoritySchema(parsed);
    }
    catch (error) {
        return {
            valid: false,
            errors: [`Failed to load schema: ${error.message}`],
            warnings: [],
        };
    }
}
