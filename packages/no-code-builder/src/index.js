"use strict";
/**
 * No-Code/Low-Code Builder
 * Form builder, UI components, business logic configuration, and validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataModelBuilder = exports.FormBuilder = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const ajv_1 = __importDefault(require("ajv"));
class FormBuilder extends events_1.EventEmitter {
    forms = new Map();
    submissions = new Map();
    ajv;
    constructor() {
        super();
        this.ajv = new ajv_1.default({ allErrors: true });
    }
    /**
     * Create a new form definition
     */
    createForm(form) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const formDefinition = {
            ...form,
            id,
            createdAt: now,
            updatedAt: now,
        };
        this.validateFormDefinition(formDefinition);
        this.forms.set(id, formDefinition);
        this.emit('form.created', formDefinition);
        return formDefinition;
    }
    /**
     * Update an existing form definition
     */
    updateForm(id, updates) {
        const form = this.forms.get(id);
        if (!form) {
            throw new Error('Form not found');
        }
        const updatedForm = {
            ...form,
            ...updates,
            id: form.id,
            createdAt: form.createdAt,
            updatedAt: new Date(),
        };
        this.validateFormDefinition(updatedForm);
        this.forms.set(id, updatedForm);
        this.emit('form.updated', updatedForm);
        return updatedForm;
    }
    /**
     * Add a field to a form
     */
    addField(formId, field) {
        const form = this.forms.get(formId);
        if (!form) {
            throw new Error('Form not found');
        }
        const fieldId = (0, uuid_1.v4)();
        const newField = {
            ...field,
            id: fieldId,
        };
        form.fields.push(newField);
        form.updatedAt = new Date();
        this.emit('form.field.added', { form, field: newField });
        return newField;
    }
    /**
     * Remove a field from a form
     */
    removeField(formId, fieldId) {
        const form = this.forms.get(formId);
        if (!form) {
            throw new Error('Form not found');
        }
        const index = form.fields.findIndex((f) => f.id === fieldId);
        if (index === -1) {
            throw new Error('Field not found');
        }
        form.fields.splice(index, 1);
        form.updatedAt = new Date();
        this.emit('form.field.removed', { form, fieldId });
    }
    /**
     * Validate form definition
     */
    validateFormDefinition(form) {
        // Check for duplicate field names
        const fieldNames = form.fields.map((f) => f.name);
        if (new Set(fieldNames).size !== fieldNames.length) {
            throw new Error('Duplicate field names found');
        }
        // Validate conditional logic references
        form.fields.forEach((field) => {
            if (field.conditional) {
                field.conditional.conditions.forEach((condition) => {
                    if (!fieldNames.includes(condition.field)) {
                        throw new Error(`Conditional logic references non-existent field: ${condition.field}`);
                    }
                });
            }
        });
        // Validate business logic references
        form.logic?.forEach((logic) => {
            logic.sourceFields?.forEach((fieldName) => {
                if (!fieldNames.includes(fieldName)) {
                    throw new Error(`Business logic references non-existent field: ${fieldName}`);
                }
            });
            if (logic.targetField && !fieldNames.includes(logic.targetField)) {
                throw new Error(`Business logic references non-existent target field: ${logic.targetField}`);
            }
        });
    }
    /**
     * Validate form submission data
     */
    validateSubmission(formId, data) {
        const form = this.forms.get(formId);
        if (!form) {
            throw new Error('Form not found');
        }
        const errors = [];
        // Validate each field
        form.fields.forEach((field) => {
            const value = data[field.name];
            // Check required fields
            if (field.required && (value === undefined || value === null || value === '')) {
                errors.push({
                    field: field.name,
                    message: field.validation?.messages?.required || `${field.label} is required`,
                    type: 'required',
                });
                return;
            }
            // Skip validation if field is not present and not required
            if (value === undefined || value === null) {
                return;
            }
            // Validate based on field validation rules
            if (field.validation) {
                const fieldErrors = this.validateField(field, value, data);
                errors.push(...fieldErrors);
            }
        });
        // Apply custom validation rules
        if (form.validation?.customRules) {
            form.validation.customRules.forEach((rule) => {
                if (!rule.rule(data)) {
                    errors.push({
                        field: '__form__',
                        message: rule.message,
                        type: 'custom',
                    });
                }
            });
        }
        // Validate against JSON schema if provided
        if (form.validation?.schema) {
            const validate = this.ajv.compile(form.validation.schema);
            const valid = validate(data);
            if (!valid && validate.errors) {
                validate.errors.forEach((error) => {
                    errors.push({
                        field: error.instancePath.slice(1) || '__form__',
                        message: error.message || 'Validation error',
                        type: 'schema',
                    });
                });
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Validate a single field
     */
    validateField(field, value, formData) {
        const errors = [];
        const validation = field.validation;
        // Min/max validation for numbers
        if (field.type === 'number') {
            if (validation.min !== undefined && value < validation.min) {
                errors.push({
                    field: field.name,
                    message: validation.messages?.min || `Must be at least ${validation.min}`,
                    type: 'min',
                });
            }
            if (validation.max !== undefined && value > validation.max) {
                errors.push({
                    field: field.name,
                    message: validation.messages?.max || `Must be at most ${validation.max}`,
                    type: 'max',
                });
            }
        }
        // Length validation for strings
        if (typeof value === 'string') {
            if (validation.minLength !== undefined && value.length < validation.minLength) {
                errors.push({
                    field: field.name,
                    message: validation.messages?.minLength ||
                        `Must be at least ${validation.minLength} characters`,
                    type: 'minLength',
                });
            }
            if (validation.maxLength !== undefined && value.length > validation.maxLength) {
                errors.push({
                    field: field.name,
                    message: validation.messages?.maxLength ||
                        `Must be at most ${validation.maxLength} characters`,
                    type: 'maxLength',
                });
            }
            // Pattern validation
            if (validation.pattern) {
                const regex = new RegExp(validation.pattern);
                if (!regex.test(value)) {
                    errors.push({
                        field: field.name,
                        message: validation.messages?.pattern || `Invalid format`,
                        type: 'pattern',
                    });
                }
            }
        }
        // Custom validation functions
        if (validation.custom) {
            validation.custom.forEach((validateFn) => {
                const result = validateFn(value, formData);
                if (!result.valid) {
                    errors.push({
                        field: field.name,
                        message: result.message || 'Validation failed',
                        type: 'custom',
                    });
                }
            });
        }
        return errors;
    }
    /**
     * Submit form data
     */
    submitForm(formId, data, submittedBy) {
        const form = this.forms.get(formId);
        if (!form) {
            throw new Error('Form not found');
        }
        // Apply business logic
        const processedData = this.applyBusinessLogic(form, data);
        // Validate submission
        const validation = this.validateSubmission(formId, processedData);
        const submissionId = (0, uuid_1.v4)();
        const submission = {
            id: submissionId,
            formId,
            data: processedData,
            status: validation.valid ? 'submitted' : 'draft',
            submittedBy,
            submittedAt: validation.valid ? new Date() : undefined,
            validationErrors: validation.errors,
        };
        // Store submission
        if (!this.submissions.has(formId)) {
            this.submissions.set(formId, []);
        }
        this.submissions.get(formId).push(submission);
        this.emit('form.submitted', submission);
        return submission;
    }
    /**
     * Apply business logic to form data
     */
    applyBusinessLogic(form, data) {
        const processedData = { ...data };
        if (!form.logic) {
            return processedData;
        }
        // Apply logic in order
        form.logic
            .filter((logic) => logic.trigger === 'onsubmit')
            .forEach((logic) => {
            switch (logic.type) {
                case 'calculation':
                    if (logic.expression && logic.targetField) {
                        try {
                            // Simple expression evaluation (production would use a safe evaluator)
                            const result = this.evaluateExpression(logic.expression, processedData);
                            processedData[logic.targetField] = result;
                        }
                        catch (error) {
                            // Log error but don't fail submission
                            this.emit('logic.error', { logic, error });
                        }
                    }
                    break;
                case 'transformation':
                    if (logic.customLogic) {
                        try {
                            const result = logic.customLogic(processedData);
                            if (logic.targetField) {
                                processedData[logic.targetField] = result;
                            }
                        }
                        catch (error) {
                            this.emit('logic.error', { logic, error });
                        }
                    }
                    break;
                case 'custom':
                    if (logic.customLogic) {
                        try {
                            logic.customLogic(processedData);
                        }
                        catch (error) {
                            this.emit('logic.error', { logic, error });
                        }
                    }
                    break;
            }
        });
        return processedData;
    }
    /**
     * Evaluate a simple expression
     */
    evaluateExpression(expression, data) {
        // Very simple expression evaluator
        // Production would use a proper expression parser
        try {
            const func = new Function(...Object.keys(data), `return ${expression}`);
            return func(...Object.values(data));
        }
        catch (error) {
            throw new Error(`Expression evaluation failed: ${error.message}`);
        }
    }
    /**
     * Get form definition
     */
    getForm(id) {
        return this.forms.get(id);
    }
    /**
     * Get all forms
     */
    getAllForms() {
        return Array.from(this.forms.values());
    }
    /**
     * Get form submissions
     */
    getSubmissions(formId) {
        return this.submissions.get(formId) || [];
    }
    /**
     * Export form to JSON schema
     */
    exportToJsonSchema(formId) {
        const form = this.forms.get(formId);
        if (!form) {
            throw new Error('Form not found');
        }
        const properties = {};
        const required = [];
        form.fields.forEach((field) => {
            const fieldSchema = {
                title: field.label,
                description: field.helpText,
            };
            // Map field type to JSON schema type
            switch (field.type) {
                case 'text':
                case 'textarea':
                case 'email':
                case 'url':
                case 'tel':
                    fieldSchema.type = 'string';
                    break;
                case 'number':
                case 'rating':
                case 'slider':
                    fieldSchema.type = 'number';
                    break;
                case 'checkbox':
                    fieldSchema.type = 'boolean';
                    break;
                case 'date':
                case 'time':
                case 'datetime':
                    fieldSchema.type = 'string';
                    fieldSchema.format = field.type;
                    break;
                case 'select':
                case 'radio':
                    fieldSchema.type = 'string';
                    if (field.options) {
                        fieldSchema.enum = field.options.map((o) => o.value);
                    }
                    break;
                case 'multi-select':
                    fieldSchema.type = 'array';
                    if (field.options) {
                        fieldSchema.items = {
                            type: 'string',
                            enum: field.options.map((o) => o.value),
                        };
                    }
                    break;
            }
            // Add validation constraints
            if (field.validation) {
                if (field.validation.min !== undefined) {
                    fieldSchema.minimum = field.validation.min;
                }
                if (field.validation.max !== undefined) {
                    fieldSchema.maximum = field.validation.max;
                }
                if (field.validation.minLength !== undefined) {
                    fieldSchema.minLength = field.validation.minLength;
                }
                if (field.validation.maxLength !== undefined) {
                    fieldSchema.maxLength = field.validation.maxLength;
                }
                if (field.validation.pattern) {
                    fieldSchema.pattern = field.validation.pattern;
                }
            }
            if (field.default !== undefined) {
                fieldSchema.default = field.default;
            }
            properties[field.name] = fieldSchema;
            if (field.required) {
                required.push(field.name);
            }
        });
        return {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            title: form.name,
            description: form.description,
            properties,
            required,
        };
    }
}
exports.FormBuilder = FormBuilder;
/**
 * Data Model Builder
 */
class DataModelBuilder extends events_1.EventEmitter {
    models = new Map();
    createModel(model) {
        const id = (0, uuid_1.v4)();
        const dataModel = {
            ...model,
            id,
        };
        this.models.set(id, dataModel);
        this.emit('model.created', dataModel);
        return dataModel;
    }
    getModel(id) {
        return this.models.get(id);
    }
    getAllModels() {
        return Array.from(this.models.values());
    }
}
exports.DataModelBuilder = DataModelBuilder;
exports.default = FormBuilder;
