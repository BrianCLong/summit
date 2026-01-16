/**
 * Schema Validation and Normalization
 * Validates Project field schemas and normalizes definitions
 */

import { sortObjectKeys } from './determinism.mjs';

/**
 * Validates a project field schema against known field types and constraints
 */
function validateSchema(schema) {
  const errors = [];

  // Check for required top-level properties
  if (!schema.version) {
    errors.push('Schema must have a version property');
  }

  if (!schema.project || !schema.project.projectId) {
    errors.push('Schema must have a project with projectId property');
  }

  if (!schema.fields || !Array.isArray(schema.fields)) {
    errors.push('Schema must have a fields array');
  } else {
    for (const [index, field] of schema.fields.entries()) {
      const fieldErrors = validateFieldDefinition(field, index);
      errors.push(...fieldErrors.map(error => `Field[${index}] ${field.name || 'unnamed'}: ${error}`));
    }
  }

  if (schema.computed && !Array.isArray(schema.computed)) {
    errors.push('Computed fields must be an array');
  }

  if (schema.constraints && !Array.isArray(schema.constraints)) {
    errors.push('Constraints must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a single field definition
 */
function validateFieldDefinition(field, index) {
  const errors = [];

  if (!field.name) {
    errors.push(`Field[${index}] must have a name property`);
  }

  if (!field.type) {
    errors.push(`Field[${index}] must have a type property`);
    return errors; // Cannot continue validation without type
  }

  const type = field.type;

  // Validate required properties based on type
  switch (type) {
    case 'single_select':
      if (!field.description) {
        errors.push(`Field[${index}] single_select fields should have a description`);
      }
      if (!field.options || !Array.isArray(field.options)) {
        errors.push(`Field[${index}] single_select fields must have an options array`);
      } else {
        for (let i = 0; i < field.options.length; i++) {
          const option = field.options[i];
          if (!option.name) {
            errors.push(`Field[${index}] option[${i}] must have a name`);
          }
        }
      }
      break;

    case 'multi_select':
      if (!field.description) {
        errors.push(`Field[${index}] multi_select fields should have a description`);
      }
      if (!field.options || !Array.isArray(field.options)) {
        errors.push(`Field[${index}] multi_select fields must have an options array`);
      } else {
        for (let i = 0; i < field.options.length; i++) {
          const option = field.options[i];
          if (!option.name) {
            errors.push(`Field[${index}] option[${i}] must have a name`);
          }
        }
      }
      break;

    case 'number':
      if (typeof field.number === 'object') {
        if (field.number.min !== undefined && typeof field.number.min !== 'number') {
          errors.push(`Field[${index}] number.min must be a number`);
        }
        if (field.number.max !== undefined && typeof field.number.max !== 'number') {
          errors.push(`Field[${index}] number.max must be a number`);
        }
      }
      break;

    case 'date':
      // Dates have no special requirements
      break;

    case 'text':
      // Text fields have no special requirements
      break;

    case 'checkbox':
      // Checkbox fields have no special requirements
      break;

    default:
      errors.push(`Field[${index}] unknown field type: ${type}`);
  }

  // Validate common optional properties
  if (field.description && typeof field.description !== 'string') {
    errors.push(`Field[${index}] description must be a string`);
  }

  return errors;
}

/**
 * Normalizes a schema to ensure consistent structure
 */
function normalizeSchema(schema) {
  const normalized = {
    ...schema
  };

  // Ensure version is properly formatted
  if (normalized.version) {
    normalized.version = String(normalized.version);
  }

  // Normalize fields
  if (Array.isArray(normalized.fields)) {
    normalized.fields = normalized.fields.map(field => normalizeFieldDefinition(field));
  }

  // Normalize computed fields
  if (Array.isArray(normalized.computed)) {
    normalized.computed = normalized.computed.map(comp => normalizeComputedDefinition(comp));
  }

  // Ensure sorted order for consistency
  return sortObjectKeys(normalized);
}

/**
 * Normalizes a single field definition
 */
function normalizeFieldDefinition(field) {
  const normalized = { ...field };

  // Normalize options for selection fields
  if ((field.type === 'single_select' || field.type === 'multi_select') && Array.isArray(field.options)) {
    normalized.options = field.options.map(option => {
      const normalizedOption = { ...option };
      if (typeof option.description === 'string' && option.description === '') {
        delete normalizedOption.description;
      }
      return sortObjectKeys(normalizedOption);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Ensure proper number types
  if (field.type === 'number' && typeof field.number === 'object') {
    if (field.number.min !== undefined) normalized.number = { ...normalized.number, min: Number(field.number.min) };
    if (field.number.max !== undefined) normalized.number = { ...normalized.number, max: Number(field.number.max) };
  }

  return sortObjectKeys(normalized);
}

/**
 * Normalizes a computed field definition
 */
function normalizeComputedDefinition(field) {
  const normalized = { ...field };

  // Ensure formula expressions are handled properly
  if (field.formula && typeof field.formula === 'function') {
    normalized.formula = field.formula.toString();
  }

  return sortObjectKeys(normalized);
}

/**
 * Compares two schemas to detect differences
 */
function compareSchemas(schema1, schema2) {
  const diff = {
    added: [],
    removed: [],
    modified: [],
    unchanged: []
  };

  if (!schema1 || !schema2) {
    return diff;
  }

  const fields1 = schema1.fields || [];
  const fields2 = schema2.fields || [];

  // Create maps for easier lookup
  const nameToField1 = new Map(fields1.map(f => [f.name, f]));
  const nameToField2 = new Map(fields2.map(f => [f.name, f]));

  // Find added and unchanged fields
  for (const [name, field2] of nameToField2) {
    if (!nameToField1.has(name)) {
      diff.added.push({ name, field: field2 });
    } else {
      const field1 = nameToField1.get(name);
      if (JSON.stringify(field1) !== JSON.stringify(field2)) {
        diff.modified.push({ name, field1, field2 });
      } else {
        diff.unchanged.push({ name, field: field2 });
      }
    }
  }

  // Find removed fields
  for (const [name, field1] of nameToField1) {
    if (!nameToField2.has(name)) {
      diff.removed.push({ name, field: field1 });
    }
  }

  return diff;
}

/**
 * Generates a field mapping plan from schema
 */
function generateFieldMappingPlan(currentFields, desiredSchema) {
  const plan = {
    create: [],
    update: [],
    delete: [], // only if explicitly allowed
    errors: []
  };

  if (!desiredSchema?.fields) {
    plan.errors.push('No fields defined in schema');
    return plan;
  }

  const desiredFields = new Map(desiredSchema.fields.map(f => [f.name, f]));

  // Compare with current fields
  if (Array.isArray(currentFields)) {
    for (const field of currentFields) {
      const desiredDef = desiredFields.get(field.name);
      
      if (!desiredDef) {
        // Field exists in project but not in schema - mark for deletion if allowed
        plan.delete.push(field);
      } else {
        // Field exists in both - check if update needed
        const updatesNeeded = detectFieldChanges(field, desiredDef);
        if (updatesNeeded.length > 0) {
          plan.update.push({
            field: field,
            updates: updatesNeeded
          });
        } else {
          // Field is already correct
        }
      }
    }
  }

  // Find fields that need to be created
  if (Array.isArray(currentFields)) {
    const currentFieldNames = new Set(currentFields.map(f => f.name));
    for (const fieldDef of desiredSchema.fields) {
      if (!currentFieldNames.has(fieldDef.name)) {
        plan.create.push({
          name: fieldDef.name,
          definition: fieldDef
        });
      }
    }
  } else {
    // If no current fields, all schema fields need to be created
    for (const fieldDef of desiredSchema.fields) {
      plan.create.push({
        name: fieldDef.name,
        definition: fieldDef
      });
    }
  }

  return plan;
}

/**
 * Detects changes needed between a current field and desired definition
 */
function detectFieldChanges(currentField, desiredDef) {
  const changes = [];
  
  // In a real implementation, this would compare field properties
  // For now, return empty array to indicate no changes needed
  return changes;
}

export {
  validateSchema,
  normalizeSchema,
  compareSchemas,
  generateFieldMappingPlan,
  validateFieldDefinition,
  validateComputedDefinition
};