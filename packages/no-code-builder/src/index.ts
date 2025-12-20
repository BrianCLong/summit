/**
 * No-Code/Low-Code Builder
 * Form builder, UI components, business logic configuration, and validation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import Ajv from 'ajv';

export interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  fields: FormField[];
  layout: FormLayout;
  validation?: ValidationRules;
  styling?: FormStyling;
  logic?: BusinessLogic[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  default?: any;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  validation?: FieldValidation;
  conditional?: ConditionalLogic;
  metadata?: Record<string, any>;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'url'
  | 'tel'
  | 'date'
  | 'time'
  | 'datetime'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'multi-select'
  | 'file'
  | 'image'
  | 'rating'
  | 'slider'
  | 'color'
  | 'wysiwyg'
  | 'custom';

export interface FieldOption {
  label: string;
  value: any;
  disabled?: boolean;
  icon?: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: ValidationFunction[];
  messages?: Record<string, string>;
}

export type ValidationFunction = (value: any, formData: Record<string, any>) => {
  valid: boolean;
  message?: string;
};

export interface ConditionalLogic {
  conditions: LogicCondition[];
  action: 'show' | 'hide' | 'enable' | 'disable' | 'required';
  operator: 'and' | 'or';
}

export interface LogicCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'empty';
  value?: any;
}

export interface FormLayout {
  type: 'single-column' | 'two-column' | 'three-column' | 'grid' | 'custom';
  sections?: FormSection[];
  responsive?: boolean;
}

export interface FormSection {
  id: string;
  title?: string;
  description?: string;
  fields: string[]; // Field IDs
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface ValidationRules {
  customRules?: Array<{
    name: string;
    rule: (formData: Record<string, any>) => boolean;
    message: string;
  }>;
  schema?: any; // JSON Schema for validation
}

export interface FormStyling {
  theme?: 'light' | 'dark' | 'custom';
  primaryColor?: string;
  fontFamily?: string;
  customCSS?: string;
  fieldSpacing?: 'compact' | 'normal' | 'relaxed';
}

export interface BusinessLogic {
  id: string;
  type: 'calculation' | 'transformation' | 'workflow' | 'custom';
  trigger: 'onchange' | 'onsubmit' | 'onload' | 'custom';
  sourceFields?: string[];
  targetField?: string;
  expression?: string;
  customLogic?: (formData: Record<string, any>) => any;
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedBy?: string;
  submittedAt?: Date;
  validationErrors?: ValidationError[];
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  type: string;
}

export interface DataModel {
  id: string;
  name: string;
  description?: string;
  fields: DataField[];
  relationships?: DataRelationship[];
  indexes?: string[][];
  metadata?: Record<string, any>;
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  unique?: boolean;
  default?: any;
  validation?: FieldValidation;
}

export interface DataRelationship {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  targetModel: string;
  foreignKey?: string;
}

export class FormBuilder extends EventEmitter {
  private forms = new Map<string, FormDefinition>();
  private submissions = new Map<string, FormSubmission[]>();
  private ajv: Ajv;

  constructor() {
    super();
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Create a new form definition
   */
  createForm(
    form: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ): FormDefinition {
    const id = uuidv4();
    const now = new Date();

    const formDefinition: FormDefinition = {
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
  updateForm(
    id: string,
    updates: Partial<FormDefinition>,
  ): FormDefinition {
    const form = this.forms.get(id);
    if (!form) {
      throw new Error('Form not found');
    }

    const updatedForm: FormDefinition = {
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
  addField(formId: string, field: Omit<FormField, 'id'>): FormField {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error('Form not found');
    }

    const fieldId = uuidv4();
    const newField: FormField = {
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
  removeField(formId: string, fieldId: string): void {
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
  private validateFormDefinition(form: FormDefinition): void {
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
            throw new Error(
              `Conditional logic references non-existent field: ${condition.field}`,
            );
          }
        });
      }
    });

    // Validate business logic references
    form.logic?.forEach((logic) => {
      logic.sourceFields?.forEach((fieldName) => {
        if (!fieldNames.includes(fieldName)) {
          throw new Error(
            `Business logic references non-existent field: ${fieldName}`,
          );
        }
      });

      if (logic.targetField && !fieldNames.includes(logic.targetField)) {
        throw new Error(
          `Business logic references non-existent target field: ${logic.targetField}`,
        );
      }
    });
  }

  /**
   * Validate form submission data
   */
  validateSubmission(
    formId: string,
    data: Record<string, any>,
  ): {
    valid: boolean;
    errors: ValidationError[];
  } {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error('Form not found');
    }

    const errors: ValidationError[] = [];

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
  private validateField(
    field: FormField,
    value: any,
    formData: Record<string, any>,
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const validation = field.validation!;

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
          message:
            validation.messages?.minLength ||
            `Must be at least ${validation.minLength} characters`,
          type: 'minLength',
        });
      }

      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push({
          field: field.name,
          message:
            validation.messages?.maxLength ||
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
  submitForm(
    formId: string,
    data: Record<string, any>,
    submittedBy?: string,
  ): FormSubmission {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error('Form not found');
    }

    // Apply business logic
    const processedData = this.applyBusinessLogic(form, data);

    // Validate submission
    const validation = this.validateSubmission(formId, processedData);

    const submissionId = uuidv4();
    const submission: FormSubmission = {
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
    this.submissions.get(formId)!.push(submission);

    this.emit('form.submitted', submission);
    return submission;
  }

  /**
   * Apply business logic to form data
   */
  private applyBusinessLogic(
    form: FormDefinition,
    data: Record<string, any>,
  ): Record<string, any> {
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
              } catch (error) {
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
              } catch (error) {
                this.emit('logic.error', { logic, error });
              }
            }
            break;

          case 'custom':
            if (logic.customLogic) {
              try {
                logic.customLogic(processedData);
              } catch (error) {
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
  private evaluateExpression(
    expression: string,
    data: Record<string, any>,
  ): any {
    // Very simple expression evaluator
    // Production would use a proper expression parser
    try {
      const func = new Function(...Object.keys(data), `return ${expression}`);
      return func(...Object.values(data));
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error.message}`);
    }
  }

  /**
   * Get form definition
   */
  getForm(id: string): FormDefinition | undefined {
    return this.forms.get(id);
  }

  /**
   * Get all forms
   */
  getAllForms(): FormDefinition[] {
    return Array.from(this.forms.values());
  }

  /**
   * Get form submissions
   */
  getSubmissions(formId: string): FormSubmission[] {
    return this.submissions.get(formId) || [];
  }

  /**
   * Export form to JSON schema
   */
  exportToJsonSchema(formId: string): any {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error('Form not found');
    }

    const properties: Record<string, any> = {};
    const required: string[] = [];

    form.fields.forEach((field) => {
      const fieldSchema: any = {
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

/**
 * Data Model Builder
 */
export class DataModelBuilder extends EventEmitter {
  private models = new Map<string, DataModel>();

  createModel(model: Omit<DataModel, 'id'>): DataModel {
    const id = uuidv4();
    const dataModel: DataModel = {
      ...model,
      id,
    };

    this.models.set(id, dataModel);
    this.emit('model.created', dataModel);
    return dataModel;
  }

  getModel(id: string): DataModel | undefined {
    return this.models.get(id);
  }

  getAllModels(): DataModel[] {
    return Array.from(this.models.values());
  }
}

export default FormBuilder;
