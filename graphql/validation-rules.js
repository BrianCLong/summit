"use strict";
/**
 * GraphQL Schema Validation Rules
 * Comprehensive validation for naming conventions, anti-patterns, and best practices
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidator = void 0;
exports.validateSchema = validateSchema;
const graphql_1 = require("graphql");
class SchemaValidator {
    errors = [];
    warnings = [];
    /**
     * Validate a GraphQL schema
     */
    validate(schema) {
        this.errors = [];
        this.warnings = [];
        // Run all validation rules
        this.validateNamingConventions(schema);
        this.validateDeprecations(schema);
        this.validateAntiPatterns(schema);
        this.validateFieldComplexity(schema);
        this.validateInputValidation(schema);
        this.validateTypeUsage(schema);
        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings,
        };
    }
    /**
     * Validate naming conventions
     */
    validateNamingConventions(schema) {
        const typeMap = schema.getTypeMap();
        for (const [typeName, type] of Object.entries(typeMap)) {
            // Skip built-in types
            if (typeName.startsWith('__'))
                continue;
            // Type names should be PascalCase
            if (!this.isPascalCase(typeName)) {
                this.addError('naming-convention', `Type "${typeName}" should use PascalCase`, typeName, `Rename to "${this.toPascalCase(typeName)}"`);
            }
            // Validate object types
            if ((0, graphql_1.isObjectType)(type) && !type.name.startsWith('__')) {
                this.validateObjectType(type);
            }
            // Validate input types
            if ((0, graphql_1.isInputObjectType)(type)) {
                this.validateInputType(type);
            }
            // Validate enum types
            if ((0, graphql_1.isEnumType)(type)) {
                this.validateEnumType(type);
            }
        }
    }
    /**
     * Validate object type
     */
    validateObjectType(type) {
        const fields = type.getFields();
        for (const [fieldName, field] of Object.entries(fields)) {
            // Field names should be camelCase
            if (!this.isCamelCase(fieldName)) {
                this.addError('naming-convention', `Field "${type.name}.${fieldName}" should use camelCase`, `${type.name}.${fieldName}`, `Rename to "${this.toCamelCase(fieldName)}"`);
            }
            // Validate field arguments
            for (const arg of field.args) {
                if (!this.isCamelCase(arg.name)) {
                    this.addError('naming-convention', `Argument "${type.name}.${fieldName}(${arg.name})" should use camelCase`, `${type.name}.${fieldName}.${arg.name}`);
                }
            }
        }
    }
    /**
     * Validate input type
     */
    validateInputType(type) {
        // Input types should end with "Input"
        if (!type.name.endsWith('Input')) {
            this.addWarning('naming-convention', `Input type "${type.name}" should end with "Input"`, type.name, `Rename to "${type.name}Input"`);
        }
        const fields = type.getFields();
        for (const [fieldName, field] of Object.entries(fields)) {
            if (!this.isCamelCase(fieldName)) {
                this.addError('naming-convention', `Input field "${type.name}.${fieldName}" should use camelCase`, `${type.name}.${fieldName}`);
            }
        }
    }
    /**
     * Validate enum type
     */
    validateEnumType(type) {
        // Enum values should be UPPER_CASE
        for (const value of type.getValues()) {
            if (!this.isUpperCase(value.name)) {
                this.addWarning('naming-convention', `Enum value "${type.name}.${value.name}" should use UPPER_CASE`, `${type.name}.${value.name}`, `Rename to "${this.toUpperCase(value.name)}"`);
            }
        }
    }
    /**
     * Validate deprecations
     */
    validateDeprecations(schema) {
        const typeMap = schema.getTypeMap();
        for (const [typeName, type] of Object.entries(typeMap)) {
            if (typeName.startsWith('__'))
                continue;
            if ((0, graphql_1.isObjectType)(type) || (0, graphql_1.isInterfaceType)(type)) {
                const fields = type.getFields();
                for (const [fieldName, field] of Object.entries(fields)) {
                    if (field.deprecationReason) {
                        // Deprecated fields should have a clear reason and migration path
                        if (field.deprecationReason.length < 10) {
                            this.addError('deprecation', `Deprecated field "${type.name}.${fieldName}" needs a detailed deprecation reason`, `${type.name}.${fieldName}`, 'Provide a clear reason and migration path (minimum 10 characters)');
                        }
                        // Check if deprecation reason includes a timeline
                        if (!field.deprecationReason.match(/\d{4}-\d{2}-\d{2}/) &&
                            !field.deprecationReason.toLowerCase().includes('use')) {
                            this.addWarning('deprecation', `Deprecated field "${type.name}.${fieldName}" should include removal date or migration instructions`, `${type.name}.${fieldName}`, 'Include "Use X instead" or removal date (YYYY-MM-DD)');
                        }
                    }
                }
            }
            if ((0, graphql_1.isEnumType)(type)) {
                for (const value of type.getValues()) {
                    if (value.deprecationReason && value.deprecationReason.length < 10) {
                        this.addError('deprecation', `Deprecated enum value "${type.name}.${value.name}" needs a detailed deprecation reason`, `${type.name}.${value.name}`);
                    }
                }
            }
        }
    }
    /**
     * Validate schema anti-patterns
     */
    validateAntiPatterns(schema) {
        const typeMap = schema.getTypeMap();
        for (const [typeName, type] of Object.entries(typeMap)) {
            if (typeName.startsWith('__'))
                continue;
            if ((0, graphql_1.isObjectType)(type)) {
                const fields = type.getFields();
                // Check for overly generic names
                const genericNames = ['data', 'info', 'details', 'item', 'value'];
                for (const [fieldName, field] of Object.entries(fields)) {
                    if (genericNames.includes(fieldName.toLowerCase())) {
                        this.addWarning('anti-pattern', `Field "${type.name}.${fieldName}" uses a generic name`, `${type.name}.${fieldName}`, 'Use a more specific, descriptive name');
                    }
                    // Check for deeply nested lists
                    if (this.isNestedList(field.type, 2)) {
                        this.addWarning('anti-pattern', `Field "${type.name}.${fieldName}" has deeply nested lists`, `${type.name}.${fieldName}`, 'Consider flattening the structure or using pagination');
                    }
                    // Check for missing pagination on list fields
                    if (this.isListField(field.type) && type.name === 'Query') {
                        const hasLimitArg = field.args.some((arg) => arg.name === 'limit' || arg.name === 'first');
                        if (!hasLimitArg) {
                            this.addWarning('anti-pattern', `Query field "${fieldName}" returns a list but doesn't have pagination`, `Query.${fieldName}`, 'Add pagination arguments (limit, offset or first, after)');
                        }
                    }
                }
                // Check for too many fields
                const fieldCount = Object.keys(fields).length;
                if (fieldCount > 50) {
                    this.addWarning('anti-pattern', `Type "${typeName}" has ${fieldCount} fields (>50)`, typeName, 'Consider splitting into multiple types');
                }
            }
        }
    }
    /**
     * Validate field complexity
     */
    validateFieldComplexity(schema) {
        const typeMap = schema.getTypeMap();
        for (const [typeName, type] of Object.entries(typeMap)) {
            if (typeName.startsWith('__'))
                continue;
            if ((0, graphql_1.isObjectType)(type)) {
                const fields = type.getFields();
                for (const [fieldName, field] of Object.entries(fields)) {
                    // Check for too many arguments
                    if (field.args.length > 10) {
                        this.addWarning('complexity', `Field "${type.name}.${fieldName}" has ${field.args.length} arguments (>10)`, `${type.name}.${fieldName}`, 'Consider using an input type to group arguments');
                    }
                    // Check for optional arguments without defaults
                    for (const arg of field.args) {
                        if (!(0, graphql_1.isNonNullType)(arg.type) &&
                            arg.defaultValue === undefined &&
                            !this.isNullableScalar(arg.type)) {
                            this.addWarning('complexity', `Optional argument "${type.name}.${fieldName}(${arg.name})" has no default value`, `${type.name}.${fieldName}.${arg.name}`, 'Provide a default value or make it required');
                        }
                    }
                }
            }
        }
    }
    /**
     * Validate input validation
     */
    validateInputValidation(schema) {
        const typeMap = schema.getTypeMap();
        for (const [typeName, type] of Object.entries(typeMap)) {
            if (typeName.startsWith('__'))
                continue;
            if ((0, graphql_1.isInputObjectType)(type)) {
                const fields = type.getFields();
                // Check for inputs without any required fields
                const hasRequiredField = Object.values(fields).some((field) => (0, graphql_1.isNonNullType)(field.type));
                if (!hasRequiredField && Object.keys(fields).length > 3) {
                    this.addWarning('input-validation', `Input type "${typeName}" has no required fields`, typeName, 'Consider making at least one field required');
                }
                // Check for string fields without validation
                for (const [fieldName, field] of Object.entries(fields)) {
                    const fieldType = this.unwrapType(field.type);
                    if (fieldType.toString() === 'String' && !field.description) {
                        this.addWarning('input-validation', `String field "${typeName}.${fieldName}" has no description`, `${typeName}.${fieldName}`, 'Add description with validation constraints');
                    }
                }
            }
        }
    }
    /**
     * Validate type usage
     */
    validateTypeUsage(schema) {
        const typeMap = schema.getTypeMap();
        const usedTypes = new Set();
        // Collect all used types
        for (const [typeName, type] of Object.entries(typeMap)) {
            if (typeName.startsWith('__'))
                continue;
            if ((0, graphql_1.isObjectType)(type) || (0, graphql_1.isInterfaceType)(type)) {
                const fields = type.getFields();
                for (const field of Object.values(fields)) {
                    this.collectUsedTypes(field.type, usedTypes);
                    for (const arg of field.args) {
                        this.collectUsedTypes(arg.type, usedTypes);
                    }
                }
            }
            if ((0, graphql_1.isInputObjectType)(type)) {
                const fields = type.getFields();
                for (const field of Object.values(fields)) {
                    this.collectUsedTypes(field.type, usedTypes);
                }
            }
        }
        // Check for unused types
        for (const [typeName, type] of Object.entries(typeMap)) {
            if (typeName.startsWith('__'))
                continue;
            if (['Query', 'Mutation', 'Subscription'].includes(typeName))
                continue;
            if (!usedTypes.has(typeName) && !(0, graphql_1.isScalarType)(type)) {
                this.addWarning('unused-type', `Type "${typeName}" is defined but never used`, typeName, 'Remove unused type or use it in your schema');
            }
        }
    }
    // Helper methods
    isPascalCase(str) {
        return /^[A-Z][a-zA-Z0-9]*$/.test(str);
    }
    isCamelCase(str) {
        return /^[a-z][a-zA-Z0-9]*$/.test(str);
    }
    isUpperCase(str) {
        return /^[A-Z][A-Z0-9_]*$/.test(str);
    }
    toPascalCase(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    toCamelCase(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
    toUpperCase(str) {
        return str.replace(/([A-Z])/g, '_$1').toUpperCase();
    }
    isListField(type) {
        if ((0, graphql_1.isNonNullType)(type)) {
            return this.isListField(type.ofType);
        }
        return (0, graphql_1.isListType)(type);
    }
    isNestedList(type, depth) {
        if (depth <= 0)
            return false;
        if ((0, graphql_1.isNonNullType)(type)) {
            return this.isNestedList(type.ofType, depth);
        }
        if ((0, graphql_1.isListType)(type)) {
            return this.isNestedList(type.ofType, depth - 1);
        }
        return false;
    }
    unwrapType(type) {
        if ((0, graphql_1.isNonNullType)(type) || (0, graphql_1.isListType)(type)) {
            return this.unwrapType(type.ofType);
        }
        return type;
    }
    isNullableScalar(type) {
        const unwrapped = this.unwrapType(type);
        return (0, graphql_1.isScalarType)(unwrapped);
    }
    collectUsedTypes(type, usedTypes) {
        if ((0, graphql_1.isNonNullType)(type) || (0, graphql_1.isListType)(type)) {
            this.collectUsedTypes(type.ofType, usedTypes);
        }
        else {
            usedTypes.add(type.toString());
        }
    }
    addError(rule, message, path, suggestion) {
        this.errors.push({ type: 'error', rule, message, path, suggestion });
    }
    addWarning(rule, message, path, suggestion) {
        this.warnings.push({ type: 'warning', rule, message, path, suggestion });
    }
}
exports.SchemaValidator = SchemaValidator;
/**
 * Validate a schema and return results
 */
function validateSchema(schema) {
    const validator = new SchemaValidator();
    return validator.validate(schema);
}
