/**
 * GraphQL Schema Validation Rules
 * Comprehensive validation for naming conventions, anti-patterns, and best practices
 */

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLField,
  GraphQLInputField,
  GraphQLArgument,
  isObjectType,
  isInterfaceType,
  isInputObjectType,
  isEnumType,
  isScalarType,
  isListType,
  isNonNullType,
  GraphQLNamedType,
  GraphQLType,
} from 'graphql';

export interface ValidationError {
  type: 'error' | 'warning';
  rule: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class SchemaValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  /**
   * Validate a GraphQL schema
   */
  validate(schema: GraphQLSchema): ValidationResult {
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
  private validateNamingConventions(schema: GraphQLSchema): void {
    const typeMap = schema.getTypeMap();

    for (const [typeName, type] of Object.entries(typeMap)) {
      // Skip built-in types
      if (typeName.startsWith('__')) continue;

      // Type names should be PascalCase
      if (!this.isPascalCase(typeName)) {
        this.addError(
          'naming-convention',
          `Type "${typeName}" should use PascalCase`,
          typeName,
          `Rename to "${this.toPascalCase(typeName)}"`
        );
      }

      // Validate object types
      if (isObjectType(type) && !type.name.startsWith('__')) {
        this.validateObjectType(type);
      }

      // Validate input types
      if (isInputObjectType(type)) {
        this.validateInputType(type);
      }

      // Validate enum types
      if (isEnumType(type)) {
        this.validateEnumType(type);
      }
    }
  }

  /**
   * Validate object type
   */
  private validateObjectType(type: GraphQLObjectType): void {
    const fields = type.getFields();

    for (const [fieldName, field] of Object.entries(fields)) {
      // Field names should be camelCase
      if (!this.isCamelCase(fieldName)) {
        this.addError(
          'naming-convention',
          `Field "${type.name}.${fieldName}" should use camelCase`,
          `${type.name}.${fieldName}`,
          `Rename to "${this.toCamelCase(fieldName)}"`
        );
      }

      // Validate field arguments
      for (const arg of field.args) {
        if (!this.isCamelCase(arg.name)) {
          this.addError(
            'naming-convention',
            `Argument "${type.name}.${fieldName}(${arg.name})" should use camelCase`,
            `${type.name}.${fieldName}.${arg.name}`
          );
        }
      }
    }
  }

  /**
   * Validate input type
   */
  private validateInputType(type: GraphQLInputObjectType): void {
    // Input types should end with "Input"
    if (!type.name.endsWith('Input')) {
      this.addWarning(
        'naming-convention',
        `Input type "${type.name}" should end with "Input"`,
        type.name,
        `Rename to "${type.name}Input"`
      );
    }

    const fields = type.getFields();
    for (const [fieldName, field] of Object.entries(fields)) {
      if (!this.isCamelCase(fieldName)) {
        this.addError(
          'naming-convention',
          `Input field "${type.name}.${fieldName}" should use camelCase`,
          `${type.name}.${fieldName}`
        );
      }
    }
  }

  /**
   * Validate enum type
   */
  private validateEnumType(type: GraphQLEnumType): void {
    // Enum values should be UPPER_CASE
    for (const value of type.getValues()) {
      if (!this.isUpperCase(value.name)) {
        this.addWarning(
          'naming-convention',
          `Enum value "${type.name}.${value.name}" should use UPPER_CASE`,
          `${type.name}.${value.name}`,
          `Rename to "${this.toUpperCase(value.name)}"`
        );
      }
    }
  }

  /**
   * Validate deprecations
   */
  private validateDeprecations(schema: GraphQLSchema): void {
    const typeMap = schema.getTypeMap();

    for (const [typeName, type] of Object.entries(typeMap)) {
      if (typeName.startsWith('__')) continue;

      if (isObjectType(type) || isInterfaceType(type)) {
        const fields = type.getFields();
        for (const [fieldName, field] of Object.entries(fields)) {
          if (field.deprecationReason) {
            // Deprecated fields should have a clear reason and migration path
            if (field.deprecationReason.length < 10) {
              this.addError(
                'deprecation',
                `Deprecated field "${type.name}.${fieldName}" needs a detailed deprecation reason`,
                `${type.name}.${fieldName}`,
                'Provide a clear reason and migration path (minimum 10 characters)'
              );
            }

            // Check if deprecation reason includes a timeline
            if (
              !field.deprecationReason.match(/\d{4}-\d{2}-\d{2}/) &&
              !field.deprecationReason.toLowerCase().includes('use')
            ) {
              this.addWarning(
                'deprecation',
                `Deprecated field "${type.name}.${fieldName}" should include removal date or migration instructions`,
                `${type.name}.${fieldName}`,
                'Include "Use X instead" or removal date (YYYY-MM-DD)'
              );
            }
          }
        }
      }

      if (isEnumType(type)) {
        for (const value of type.getValues()) {
          if (value.deprecationReason && value.deprecationReason.length < 10) {
            this.addError(
              'deprecation',
              `Deprecated enum value "${type.name}.${value.name}" needs a detailed deprecation reason`,
              `${type.name}.${value.name}`
            );
          }
        }
      }
    }
  }

  /**
   * Validate schema anti-patterns
   */
  private validateAntiPatterns(schema: GraphQLSchema): void {
    const typeMap = schema.getTypeMap();

    for (const [typeName, type] of Object.entries(typeMap)) {
      if (typeName.startsWith('__')) continue;

      if (isObjectType(type)) {
        const fields = type.getFields();

        // Check for overly generic names
        const genericNames = ['data', 'info', 'details', 'item', 'value'];
        for (const [fieldName, field] of Object.entries(fields)) {
          if (genericNames.includes(fieldName.toLowerCase())) {
            this.addWarning(
              'anti-pattern',
              `Field "${type.name}.${fieldName}" uses a generic name`,
              `${type.name}.${fieldName}`,
              'Use a more specific, descriptive name'
            );
          }

          // Check for deeply nested lists
          if (this.isNestedList(field.type, 2)) {
            this.addWarning(
              'anti-pattern',
              `Field "${type.name}.${fieldName}" has deeply nested lists`,
              `${type.name}.${fieldName}`,
              'Consider flattening the structure or using pagination'
            );
          }

          // Check for missing pagination on list fields
          if (this.isListField(field.type) && type.name === 'Query') {
            const hasLimitArg = field.args.some(
              (arg) => arg.name === 'limit' || arg.name === 'first'
            );
            if (!hasLimitArg) {
              this.addWarning(
                'anti-pattern',
                `Query field "${fieldName}" returns a list but doesn't have pagination`,
                `Query.${fieldName}`,
                'Add pagination arguments (limit, offset or first, after)'
              );
            }
          }
        }

        // Check for too many fields
        const fieldCount = Object.keys(fields).length;
        if (fieldCount > 50) {
          this.addWarning(
            'anti-pattern',
            `Type "${typeName}" has ${fieldCount} fields (>50)`,
            typeName,
            'Consider splitting into multiple types'
          );
        }
      }
    }
  }

  /**
   * Validate field complexity
   */
  private validateFieldComplexity(schema: GraphQLSchema): void {
    const typeMap = schema.getTypeMap();

    for (const [typeName, type] of Object.entries(typeMap)) {
      if (typeName.startsWith('__')) continue;

      if (isObjectType(type)) {
        const fields = type.getFields();
        for (const [fieldName, field] of Object.entries(fields)) {
          // Check for too many arguments
          if (field.args.length > 10) {
            this.addWarning(
              'complexity',
              `Field "${type.name}.${fieldName}" has ${field.args.length} arguments (>10)`,
              `${type.name}.${fieldName}`,
              'Consider using an input type to group arguments'
            );
          }

          // Check for optional arguments without defaults
          for (const arg of field.args) {
            if (
              !isNonNullType(arg.type) &&
              arg.defaultValue === undefined &&
              !this.isNullableScalar(arg.type)
            ) {
              this.addWarning(
                'complexity',
                `Optional argument "${type.name}.${fieldName}(${arg.name})" has no default value`,
                `${type.name}.${fieldName}.${arg.name}`,
                'Provide a default value or make it required'
              );
            }
          }
        }
      }
    }
  }

  /**
   * Validate input validation
   */
  private validateInputValidation(schema: GraphQLSchema): void {
    const typeMap = schema.getTypeMap();

    for (const [typeName, type] of Object.entries(typeMap)) {
      if (typeName.startsWith('__')) continue;

      if (isInputObjectType(type)) {
        const fields = type.getFields();

        // Check for inputs without any required fields
        const hasRequiredField = Object.values(fields).some((field) =>
          isNonNullType(field.type)
        );

        if (!hasRequiredField && Object.keys(fields).length > 3) {
          this.addWarning(
            'input-validation',
            `Input type "${typeName}" has no required fields`,
            typeName,
            'Consider making at least one field required'
          );
        }

        // Check for string fields without validation
        for (const [fieldName, field] of Object.entries(fields)) {
          const fieldType = this.unwrapType(field.type);
          if (fieldType.toString() === 'String' && !field.description) {
            this.addWarning(
              'input-validation',
              `String field "${typeName}.${fieldName}" has no description`,
              `${typeName}.${fieldName}`,
              'Add description with validation constraints'
            );
          }
        }
      }
    }
  }

  /**
   * Validate type usage
   */
  private validateTypeUsage(schema: GraphQLSchema): void {
    const typeMap = schema.getTypeMap();
    const usedTypes = new Set<string>();

    // Collect all used types
    for (const [typeName, type] of Object.entries(typeMap)) {
      if (typeName.startsWith('__')) continue;

      if (isObjectType(type) || isInterfaceType(type)) {
        const fields = type.getFields();
        for (const field of Object.values(fields)) {
          this.collectUsedTypes(field.type, usedTypes);
          for (const arg of field.args) {
            this.collectUsedTypes(arg.type, usedTypes);
          }
        }
      }

      if (isInputObjectType(type)) {
        const fields = type.getFields();
        for (const field of Object.values(fields)) {
          this.collectUsedTypes(field.type, usedTypes);
        }
      }
    }

    // Check for unused types
    for (const [typeName, type] of Object.entries(typeMap)) {
      if (typeName.startsWith('__')) continue;
      if (
        ['Query', 'Mutation', 'Subscription'].includes(typeName)
      )
        continue;

      if (!usedTypes.has(typeName) && !isScalarType(type)) {
        this.addWarning(
          'unused-type',
          `Type "${typeName}" is defined but never used`,
          typeName,
          'Remove unused type or use it in your schema'
        );
      }
    }
  }

  // Helper methods

  private isPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }

  private isCamelCase(str: string): boolean {
    return /^[a-z][a-zA-Z0-9]*$/.test(str);
  }

  private isUpperCase(str: string): boolean {
    return /^[A-Z][A-Z0-9_]*$/.test(str);
  }

  private toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  private toUpperCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toUpperCase();
  }

  private isListField(type: GraphQLType): boolean {
    if (isNonNullType(type)) {
      return this.isListField(type.ofType);
    }
    return isListType(type);
  }

  private isNestedList(type: GraphQLType, depth: number): boolean {
    if (depth <= 0) return false;
    if (isNonNullType(type)) {
      return this.isNestedList(type.ofType, depth);
    }
    if (isListType(type)) {
      return this.isNestedList(type.ofType, depth - 1);
    }
    return false;
  }

  private unwrapType(type: GraphQLType): GraphQLNamedType {
    if (isNonNullType(type) || isListType(type)) {
      return this.unwrapType(type.ofType);
    }
    return type;
  }

  private isNullableScalar(type: GraphQLType): boolean {
    const unwrapped = this.unwrapType(type);
    return isScalarType(unwrapped);
  }

  private collectUsedTypes(type: GraphQLType, usedTypes: Set<string>): void {
    if (isNonNullType(type) || isListType(type)) {
      this.collectUsedTypes(type.ofType, usedTypes);
    } else {
      usedTypes.add(type.toString());
    }
  }

  private addError(
    rule: string,
    message: string,
    path?: string,
    suggestion?: string
  ): void {
    this.errors.push({ type: 'error', rule, message, path, suggestion });
  }

  private addWarning(
    rule: string,
    message: string,
    path?: string,
    suggestion?: string
  ): void {
    this.warnings.push({ type: 'warning', rule, message, path, suggestion });
  }
}

/**
 * Validate a schema and return results
 */
export function validateSchema(schema: GraphQLSchema): ValidationResult {
  const validator = new SchemaValidator();
  return validator.validate(schema);
}
