"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPromptTemplate = createPromptTemplate;
const errors_js_1 = require("./errors.js");
const test_generator_js_1 = require("./testing/test-generator.js");
const PLACEHOLDER_REGEX = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
function createPromptTemplate(config) {
    const validatedSlots = config.slots;
    const placeholders = collectPlaceholders(config.template);
    if (placeholders.size === 0) {
        throw new Error(`Prompt template "${config.name}" must contain at least one slot placeholder.`);
    }
    const template = {
        name: config.name,
        description: config.description,
        template: config.template,
        slots: validatedSlots,
        metadata: config.metadata,
        validate(values) {
            return validateValues(config.name, validatedSlots, placeholders, values);
        },
        compile(values) {
            const validation = validateValues(config.name, validatedSlots, placeholders, values);
            if (!validation.valid || !validation.value) {
                const errorMap = {};
                for (const item of validation.errors) {
                    errorMap[item.slot] = item.details;
                }
                throw new errors_js_1.PromptValidationError(config.name, errorMap);
            }
            const rendered = renderTemplate(config.template, validation.value);
            return {
                name: config.name,
                description: config.description,
                template: config.template,
                rendered,
                slots: validatedSlots,
                values: validation.value,
                metadata: config.metadata,
            };
        },
        render(values) {
            return this.compile(values).rendered;
        },
        formatFor(adapter, values, options = {}) {
            const compiled = this.compile(values);
            return adapter.format(compiled, options);
        },
        generateTestSuite(options) {
            return (0, test_generator_js_1.generateTestSuite)(this, options);
        },
    };
    return template;
}
function collectPlaceholders(template) {
    const matches = template.matchAll(PLACEHOLDER_REGEX);
    const set = new Set();
    for (const match of matches) {
        const placeholder = match[1];
        if (!placeholder) {
            continue;
        }
        set.add(placeholder.trim());
    }
    return set;
}
function validateValues(templateName, slots, placeholders, values) {
    const slotNames = Object.keys(slots);
    const resolved = {};
    const slotOutcomes = {};
    const errors = [];
    for (const slotName of slotNames) {
        const schema = slots[slotName];
        const value = values[slotName];
        const outcome = validateSlot(slotName, schema, value);
        slotOutcomes[slotName] = outcome;
        if (outcome.valid) {
            resolved[slotName] = outcome.value;
        }
        else {
            errors.push({
                slot: slotName,
                details: 'errors' in outcome && Array.isArray(outcome.errors)
                    ? outcome.errors
                    : [],
            });
        }
    }
    for (const placeholder of placeholders) {
        if (!(placeholder in slots)) {
            errors.push({
                slot: placeholder,
                details: [
                    {
                        code: 'slot.undefined',
                        message: `Placeholder "${placeholder}" is not defined in slot schema.`,
                    },
                ],
            });
        }
    }
    const extraneous = Object.keys(values ?? {}).filter((key) => !(key in slots));
    for (const key of extraneous) {
        errors.push({
            slot: key,
            details: [
                {
                    code: 'slot.unexpected',
                    message: `Value provided for undefined slot "${key}".`,
                },
            ],
        });
    }
    if (errors.length > 0) {
        return {
            valid: false,
            slots: slotOutcomes,
            errors,
        };
    }
    return {
        valid: true,
        slots: slotOutcomes,
        errors,
        value: resolved,
    };
}
function validateSlot(slotName, schema, value) {
    switch (schema.kind) {
        case 'string':
            return validateStringSlot(slotName, schema, value);
        case 'number':
            return validateNumberSlot(slotName, schema, value);
        case 'boolean':
            return validateBooleanSlot(slotName, schema, value);
        case 'enum':
            return validateEnumSlot(slotName, schema, value);
        default:
            return {
                valid: false,
                errors: [
                    {
                        code: 'slot.unsupported',
                        message: `Slot "${slotName}" has unsupported kind ${schema.kind}.`,
                    },
                ],
            };
    }
}
function validateStringSlot(slotName, schema, value) {
    if (value === undefined || value === null) {
        if (schema.defaultValue !== undefined) {
            return { valid: true, value: schema.defaultValue };
        }
        if (schema.optional) {
            return { valid: true, value: '' };
        }
        return {
            valid: false,
            errors: [
                { code: 'slot.required', message: `Slot "${slotName}" is required.` },
            ],
        };
    }
    if (typeof value !== 'string') {
        return {
            valid: false,
            errors: [
                {
                    code: 'slot.type',
                    message: `Slot "${slotName}" must be a string.`,
                },
            ],
        };
    }
    const constraints = schema.constraints;
    const violations = [];
    if (constraints?.minLength !== undefined &&
        value.length < constraints.minLength) {
        violations.push({
            code: 'string.minLength',
            message: `Length must be >= ${constraints.minLength}.`,
            meta: { provided: value.length },
        });
    }
    if (constraints?.maxLength !== undefined &&
        value.length > constraints.maxLength) {
        violations.push({
            code: 'string.maxLength',
            message: `Length must be <= ${constraints.maxLength}.`,
            meta: { provided: value.length },
        });
    }
    if (constraints?.pattern && !constraints.pattern.test(value)) {
        violations.push({
            code: 'string.pattern',
            message: `Value does not match required pattern ${constraints.pattern}.`,
        });
    }
    if (violations.length > 0) {
        return { valid: false, errors: violations };
    }
    return { valid: true, value };
}
function validateNumberSlot(slotName, schema, value) {
    if (value === undefined || value === null) {
        if (schema.defaultValue !== undefined) {
            return { valid: true, value: schema.defaultValue };
        }
        if (schema.optional) {
            return {
                valid: false,
                errors: [
                    {
                        code: 'slot.required',
                        message: `Slot "${slotName}" is optional but requires a defaultValue for numeric slots.`,
                    },
                ],
            };
        }
        return {
            valid: false,
            errors: [
                { code: 'slot.required', message: `Slot "${slotName}" is required.` },
            ],
        };
    }
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return {
            valid: false,
            errors: [
                {
                    code: 'slot.type',
                    message: `Slot "${slotName}" must be a finite number.`,
                },
            ],
        };
    }
    const constraints = schema.constraints;
    const violations = [];
    if (constraints?.min !== undefined && value < constraints.min) {
        violations.push({
            code: 'number.min',
            message: `Value must be >= ${constraints.min}.`,
            meta: { provided: value },
        });
    }
    if (constraints?.max !== undefined && value > constraints.max) {
        violations.push({
            code: 'number.max',
            message: `Value must be <= ${constraints.max}.`,
            meta: { provided: value },
        });
    }
    if (violations.length > 0) {
        return { valid: false, errors: violations };
    }
    return { valid: true, value };
}
function validateBooleanSlot(slotName, schema, value) {
    if (value === undefined || value === null) {
        if (schema.defaultValue !== undefined) {
            return { valid: true, value: schema.defaultValue };
        }
        if (schema.optional) {
            return {
                valid: false,
                errors: [
                    {
                        code: 'slot.required',
                        message: `Slot "${slotName}" is optional but requires a defaultValue for boolean slots.`,
                    },
                ],
            };
        }
        return {
            valid: false,
            errors: [
                { code: 'slot.required', message: `Slot "${slotName}" is required.` },
            ],
        };
    }
    if (typeof value !== 'boolean') {
        return {
            valid: false,
            errors: [
                {
                    code: 'slot.type',
                    message: `Slot "${slotName}" must be a boolean.`,
                },
            ],
        };
    }
    return { valid: true, value };
}
function validateEnumSlot(slotName, schema, value) {
    if (value === undefined || value === null) {
        if (schema.defaultValue !== undefined) {
            return { valid: true, value: schema.defaultValue };
        }
        if (schema.optional) {
            return {
                valid: false,
                errors: [
                    {
                        code: 'slot.required',
                        message: `Slot "${slotName}" is optional but requires a defaultValue for enum slots.`,
                    },
                ],
            };
        }
        return {
            valid: false,
            errors: [
                { code: 'slot.required', message: `Slot "${slotName}" is required.` },
            ],
        };
    }
    if (typeof value !== 'string') {
        return {
            valid: false,
            errors: [
                {
                    code: 'slot.type',
                    message: `Slot "${slotName}" must be a string literal.`,
                },
            ],
        };
    }
    if (!schema.values.includes(value)) {
        return {
            valid: false,
            errors: [
                {
                    code: 'enum.value',
                    message: `Value must be one of: ${schema.values.join(', ')}.`,
                },
            ],
        };
    }
    return { valid: true, value };
}
function renderTemplate(template, values) {
    return template.replace(PLACEHOLDER_REGEX, (_match, group) => {
        const key = group.trim();
        const value = values[key];
        if (value === undefined || value === null) {
            return '';
        }
        return typeof value === 'string' ? value : String(value);
    });
}
