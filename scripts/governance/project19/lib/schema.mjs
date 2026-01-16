/**
 * Schema Validation and Management Library
 * Validates field schemas against known field types and constraints
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
    // Validate each field definition
    for (const [index, fieldDef] of schema.fields.entries()) {
      const fieldErrors = validateFieldDefinition(fieldDef, index);
      errors.push(...fieldErrors.map(error => `Field[${index}] ${fieldDef.name || 'unnamed'}: ${error}`));
    }
  }

  if (schema.computed && !Array.isArray(schema.computed)) {
    errors.push('Computed fields must be an array');
  }

  if (schema.constraints && !Array.isArray(schema.constraints)) {
    errors.push('Constraints must be an array');
  }

  if (schema.mappings && !Array.isArray(schema.mappings)) {
    errors.push('Mappings must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a single field definition
 */
function validateFieldDefinition(fieldDef, index) {
  const errors = [];

  if (!fieldDef.name) {
    errors.push(`Field[${index}] must have a name property`);
  }

  if (!fieldDef.type) {
    errors.push(`Field[${index}] must have a type property`);
    return errors; // Cannot continue validation without type
  }

  const type = fieldDef.type;

  // Validate required properties based on type
  switch (type) {
    case 'single_select':
    case 'multi_select':
      if (!fieldDef.options || !Array.isArray(fieldDef.options)) {
        errors.push(`Field[${index}] selection fields must have an options array`);
      } else {
        for (let i = 0; i < fieldDef.options.length; i++) {
          const option = fieldDef.options[i];
          if (!option.name) {
            errors.push(`Field[${index}] option[${i}] must have a name`);
          }
        }
      }
      break;

    case 'number':
      if (fieldDef.number && typeof fieldDef.number === 'object') {
        if (fieldDef.number.min !== undefined && typeof fieldDef.number.min !== 'number') {
          errors.push(`Field[${index}] number.min must be a number`);
        }
        if (fieldDef.number.max !== undefined && typeof fieldDef.number.max !== 'number') {
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
  if (fieldDef.description && typeof fieldDef.description !== 'string') {
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
  
  // Normalize constraints
  if (Array.isArray(normalized.constraints)) {
    normalized.constraints = normalized.constraints.map(constraint => normalizeConstraintDefinition(constraint));
  }

  // Normalize mappings
  if (Array.isArray(normalized.mappings)) {
    normalized.mappings = normalized.mappings.map(mapping => normalizeMappingDefinition(mapping));
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
 * Normalizes a constraint definition
 */
function normalizeConstraintDefinition(constraint) {
  const normalized = { ...constraint };

  return sortObjectKeys(normalized);
}

/**
 * Normalizes a mapping definition
 */
function normalizeMappingDefinition(mapping) {
  const normalized = { ...mapping };

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

  // Convert fields to maps for easier comparison
  const fields1 = new Map((schema1.fields || []).map(f => [f.name, f]));
  const fields2 = new Map((schema2.fields || []).map(f => [f.name, f]));

  const allFieldNames = new Set([
    ...fields1.keys(),
    ...fields2.keys()
  ]);

  for (const fieldName of allFieldNames) {
    const field1 = fields1.get(fieldName);
    const field2 = fields2.get(fieldName);

    if (!field1 && field2) {
      diff.added.push({
        name: fieldName,
        definition: field2
      });
    } else if (field1 && !field2) {
      diff.removed.push({
        name: fieldName,
        definition: field1
      });
    } else if (JSON.stringify(field1) !== JSON.stringify(field2)) {
      diff.modified.push({
        name: fieldName,
        original: field1,
        updated: field2
      });
    } else {
      diff.unchanged.push({
        name: fieldName,
        definition: field1
      });
    }
  }

  return diff;
}

/**
 * Generates a field mapping plan from schema
 */
function generateFieldMappingPlan(currentProjectFields, desiredSchema) {
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

  // Convert current fields to map for easier comparison
  const currentFieldMap = new Map();
  if (currentProjectFields) {
    for (const field of currentProjectFields) {
      if (field.name) {
        currentFieldMap.set(field.name, field);
      }
    }
  }

  // Process field mapping
  for (const fieldDef of desiredSchema.fields) {
    const currentField = currentFieldMap.get(fieldDef.name);

    if (!currentField) {
      // Field doesn't exist, need to create
      plan.create.push({
        name: fieldDef.name,
        definition: fieldDef
      });
    } else {
      // Field exists, check if it needs updating
      const updatesNeeded = detectFieldChanges(currentField, fieldDef);
      
      if (updatesNeeded.length > 0) {
        plan.update.push({
          field: currentField,
          definition: fieldDef,
          updates: updatesNeeded
        });
      }
    }
  }

  // Find fields that exist but are not in desired schema (candidates for deletion)
  if (currentProjectFields) {
    for (const currentField of currentProjectFields) {
      if (!desiredSchema.fields.some(desired => desired.name === currentField.name)) {
        plan.delete.push(currentField);
      }
    }
  }

  return plan;
}

/**
 * Detects changes needed between current field and desired definition
 */
function detectFieldChanges(currentField, desiredDef) {
  const changes = [];

  // Check if field type matches
  if (currentField.type !== desiredDef.type) {
    changes.push({
      type: 'type_change',
      from: currentField.type,
      to: desiredDef.type
    });
  }

  // Check if options match for selection fields
  if ((currentField.type === 'single_select' || currentField.type === 'multi_select') && 
      currentField.options && desiredDef.options) {
    
    const currentOptionNames = new Set(currentField.options.map(opt => opt.name));
    const desiredOptionNames = new Set(desiredDef.options.map(opt => opt.name));
    
    // Check for new options
    for (const optName of desiredOptionNames) {
      if (!currentOptionNames.has(optName)) {
        changes.push({
          type: 'option_addition',
          option: optName
        });
      }
    }
    
    // Check for removed options
    for (const optName of currentOptionNames) {
      if (!desiredOptionNames.has(optName)) {
        changes.push({
          type: 'option_removal',
          option: optName
        });
      }
    }
  }

  // Check if other properties match
  if (currentField.description !== desiredDef.description) {
    changes.push({
      type: 'description_change',
      from: currentField.description,
      to: desiredDef.description
    });
  }

  if (currentField.required !== desiredDef.required) {
    changes.push({
      type: 'required_change',
      from: currentField.required,
      to: desiredDef.required
    });
  }

  return changes;
}

/**
 * Validates that all required computed fields exist
 */
function validateComputedFields(computedFields, availableFields) {
  const errors = [];
  const availableFieldNames = new Set(availableFields.map(f => f.name) || []);

  for (const comp of computedFields || []) {
    if (comp.dependsOn) {
      for (const dep of comp.dependsOn) {
        if (!availableFieldNames.has(dep)) {
          errors.push(`Computed field "${comp.name}" depends on missing field "${dep}"`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates that field constraints are properly defined
 */
function validateConstraints(constraints, availableFields) {
  const errors = [];
  const availableFieldNames = new Set(availableFields.map(f => f.name) || []);

  for (const constraint of constraints || []) {
    if (constraint.fields) {
      for (const field of constraint.fields) {
        if (!availableFieldNames.has(field)) {
          errors.push(`Constraint "${constraint.name}" references missing field "${field}"`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generates a unique signature for a schema
 */
function generateSchemaSignature(schema) {
  const normalized = normalizeSchema(schema);
  const jsonString = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

export {
  validateSchema,
  normalizeSchema,
  compareSchemas,
  generateFieldMappingPlan,
  validateFieldDefinition,
  validateComputedFields,
  validateConstraints,
  generateSchemaSignature,
  detectFieldChanges
};