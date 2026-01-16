/**
 * Field Operations
 * Handles creation, validation, and management of GitHub Project fields
 */

import GitHubGraphQLClient from './github-graphql.mjs';
import { validateSchema, normalizeSchema, generateFieldMappingPlan } from './schema.mjs';

class FieldOperations {
  constructor(token) {
    this.client = new GitHubGraphQLClient(token);
  }

  /**
   * Ensures fields match the desired schema
   */
  async ensureFieldsExist(projectId, schema, options = {}) {
    const {
      dryRun = true,
      maxFixScope = 50,
      allowDestructive = false
    } = options;

    // Validate schema first
    const validation = validateSchema(schema);
    if (!validation.valid) {
      throw new Error(`Schema validation failed: ${validation.errors.join('; ')}`);
    }

    // Get current project fields
    const currentFields = await this.getProjectFields(projectId);
    
    // Generate mapping plan
    const plan = generateFieldMappingPlan(currentFields, schema);
    
    // Calculate total planned operations
    const totalOperations = plan.create.length + plan.update.length + 
                           (allowDestructive ? plan.delete.length : 0);
                           
    if (totalOperations > maxFixScope) {
      throw new Error(`Planned operations (${totalOperations}) exceed maxFixScope (${maxFixScope})`);
    }

    if (dryRun) {
      // Just return the plan
      return {
        plan,
        totalOperations,
        dryRun: true
      };
    }

    // Execute the plan
    const results = {
      created: [],
      updated: [],
      deleted: [],
      errors: [],
      totalOperations
    };

    // Create new fields
    for (const field of plan.create) {
      try {
        const result = await this.createField(projectId, field.name, field.definition);
        results.created.push(result);
      } catch (error) {
        results.errors.push(`Failed to create field ${field.name}: ${error.message}`);
      }
    }

    // Update existing fields (only options for now)
    for (const updateOp of plan.update) {
      try {
        const result = await this.updateFieldOptions(updateOp.field, updateOp.updates);
        results.updated.push(result);
      } catch (error) {
        results.errors.push(`Failed to update field ${updateOp.field.name}: ${error.message}`);
      }
    }

    // Delete fields if allowed
    if (allowDestructive) {
      for (const field of plan.delete) {
        try {
          const result = await this.deleteField(projectId, field.id);
          results.deleted.push(result);
        } catch (error) {
          results.errors.push(`Failed to delete field ${field.name}: ${error.message}`);
        }
      }
    }

    return results;
  }

  /**
   * Get all fields for a project
   */
  async getProjectFields(projectId) {
    const query = `
      query GetProjectFields($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            title
            fields(first: 100) {
              nodes {
                ... on ProjectV2FieldCommon {
                  id
                  name
                  dataType
                }
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  dataType
                  options {
                    id
                    name
                  }
                }
                ... on ProjectV2MultipleSelectField {
                  id
                  name
                  dataType
                  options {
                    id
                    name
                  }
                }
                ... on ProjectV2DateField {
                  id
                  name
                  dataType
                }
                ... on ProjectV2NumberField {
                  id
                  name
                  dataType
                }
                ... on ProjectV2IterationField {
                  id
                  name
                  dataType
                  configuration { 
                    iterations { 
                      title 
                      startDate 
                      duration
                    } 
                  }
                }
                ... on ProjectV2UserField {
                  id
                  name
                  dataType
                }
                ... on ProjectV2Text {
                  id
                  name
                  dataType
                }
              }
            }
          }
        }
      }
    `;

    const result = await this.client.query(query, { projectId });
    return result.node.fields.nodes;
  }

  /**
   * Create a new field in the project
   */
  async createField(projectId, fieldName, fieldDefinition) {
    // Determine field type and create appropriate mutation
    switch (fieldDefinition.type) {
      case 'single_select':
        return this.createSingleSelectField(projectId, fieldName, fieldDefinition);
      case 'multi_select':
        return this.createMultiSelectField(projectId, fieldName, fieldDefinition);
      case 'text':
        return this.createTextField(projectId, fieldName, fieldDefinition);
      case 'number':
        return this.createNumberField(projectId, fieldName, fieldDefinition);
      case 'date':
        return this.createDateField(projectId, fieldName, fieldDefinition);
      case 'iteration':
        return this.createIterationField(projectId, fieldName, fieldDefinition);
      default:
        throw new Error(`Unsupported field type: ${fieldDefinition.type}`);
    }
  }

  /**
   * Create a single select field
   */
  async createSingleSelectField(projectId, fieldName, fieldDefinition) {
    const mutation = `
      mutation CreateSingleSelectField($projectId: ID!, $name: String!) {
        addProjectV2SingleSelectField(
          input: {
            projectId: $projectId
            name: $name
          }
        ) {
          field {
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
        }
      }
    `;

    const result = await this.client.query(mutation, { projectId, name: fieldName });
    
    // Add options to the created field if they were specified
    if (fieldDefinition.options) {
      const fieldId = result.addProjectV2SingleSelectField.field.id;
      for (const option of fieldDefinition.options) {
        await this.addSingleSelectOption(fieldId, option.name);
      }
    }

    return result.addProjectV2SingleSelectField.field;
  }

  /**
   * Add option to single select field
   */
  async addSingleSelectOption(fieldId, optionName) {
    const mutation = `
      mutation AddSingleSelectOption($fieldId: ID!, $name: String!) {
        addProjectV2SingleSelectFieldOption(
          input: {
            fieldId: $fieldId
            name: $name
          }
        ) {
          field {
            ... on ProjectV2SingleSelectField {
              id
              options {
                id
                name
              }
            }
          }
        }
      }
    `;

    return this.client.query(mutation, { fieldId, name: optionName });
  }

  /**
   * Create a multi select field
   */
  async createMultiSelectField(projectId, fieldName, fieldDefinition) {
    const mutation = `
      mutation CreateMultiSelectField($projectId: ID!, $name: String!) {
        addProjectV2MultiSelectField(
          input: {
            projectId: $projectId
            name: $name
          }
        ) {
          field {
            ... on ProjectV2MultiSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
        }
      }
    `;

    const result = await this.client.query(mutation, { projectId, name: fieldName });
    
    // Add options to the created field if they were specified
    if (fieldDefinition.options) {
      const fieldId = result.addProjectV2MultiSelectField.field.id;
      for (const option of fieldDefinition.options) {
        await this.addMultiSelectOption(fieldId, option.name);
      }
    }

    return result.addProjectV2MultiSelectField.field;
  }

  /**
   * Add option to multi select field
   */
  async addMultiSelectOption(fieldId, optionName) {
    const mutation = `
      mutation AddMultiSelectOption($fieldId: ID!, $name: String!) {
        addProjectV2MultiSelectFieldOption(
          input: {
            fieldId: $fieldId
            name: $name
          }
        ) {
          field {
            ... on ProjectV2MultiSelectField {
              id
              options {
                id
                name
              }
            }
          }
        }
      }
    `;

    return this.client.query(mutation, { fieldId, name: optionName });
  }

  /**
   * Create a text field
   */
  async createTextField(projectId, fieldName) {
    const mutation = `
      mutation CreateTextField($projectId: ID!, $name: String!) {
        addProjectV2TextField(
          input: {
            projectId: $projectId
            name: $name
          }
        ) {
          field {
            ... on ProjectV2FieldCommon {
              id
              name
              dataType
            }
          }
        }
      }
    `;

    return this.client.query(mutation, { projectId, name: fieldName });
  }

  /**
   * Create a number field
   */
  async createNumberField(projectId, fieldName) {
    const mutation = `
      mutation CreateNumberField($projectId: ID!, $name: String!) {
        addProjectV2NumberField(
          input: {
            projectId: $projectId
            name: $name
          }
        ) {
          field {
            ... on ProjectV2FieldCommon {
              id
              name
              dataType
            }
          }
        }
      }
    `;

    return this.client.query(mutation, { projectId, name: fieldName });
  }

  /**
   * Create a date field
   */
  async createDateField(projectId, fieldName) {
    const mutation = `
      mutation CreateDateField($projectId: ID!, $name: String!) {
        addProjectV2DateField(
          input: {
            projectId: $projectId
            name: $name
          }
        ) {
          field {
            ... on ProjectV2FieldCommon {
              id
              name
              dataType
            }
          }
        }
      }
    `;

    return this.client.query(mutation, { projectId, name: fieldName });
  }

  /**
   * Create an iteration field
   */
  async createIterationField(projectId, fieldName) {
    const mutation = `
      mutation CreateIterationField($projectId: ID!, $name: String!) {
        addProjectV2IterationField(
          input: {
            projectId: $projectId
            name: $name
          }
        ) {
          field {
            ... on ProjectV2IterationField {
              id
              name
              dataType
              configuration {
                iterations {
                  id
                  title
                  startDate
                  duration
                }
              }
            }
          }
        }
      }
    `;

    return this.client.query(mutation, { projectId, name: fieldName });
  }

  /**
   * Update field options (add new options only)
   */
  async updateFieldOptions(field, updates) {
    const results = [];
    
    // In GitHub Projects API, options need to be added individually
    // For now, we just add new options that aren't already present
    const newOptions = updates.filter(u => u.operation === 'add_option');
    
    for (const optionUpdate of newOptions) {
      if (field.__typename === 'ProjectV2SingleSelectField') {
        const result = await this.addSingleSelectOption(field.id, optionUpdate.value);
        results.push(result);
      } else if (field.__typename === 'ProjectV2MultiSelectField') {
        const result = await this.addMultiSelectOption(field.id, optionUpdate.value);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Delete a field (only if explicitly allowed)
   * NOTE: GitHub does not provide a direct way to delete custom fields
   * This is included for completeness but won't work in practice
   */
  async deleteField(projectId, fieldId) {
    throw new Error('Field deletion is not supported by GitHub Projects API');
  }

  /**
   * Generate a mapping of field names to their IDs and option mappings
   */
  async generateFieldMap(projectId, schema) {
    const currentFields = await this.getProjectFields(projectId);
    
    const fieldMap = {
      projectId: projectId,
      fields: {},
      singleSelectOptions: {},
      multiSelectOptions: {}
    };

    // Build field ID mapping
    for (const field of currentFields) {
      fieldMap.fields[field.name] = field.id;
      
      // For selection fields, map options
      if (field.options) {
        if (field.__typename === 'ProjectV2SingleSelectField') {
          fieldMap.singleSelectOptions[field.name] = {};
          for (const option of field.options) {
            fieldMap.singleSelectOptions[field.name][option.name] = option.id;
          }
        } else if (field.__typename === 'ProjectV2MultiSelectField') {
          fieldMap.multiSelectOptions[field.name] = {};
          for (const option of field.options) {
            fieldMap.multiSelectOptions[field.name][option.name] = option.id;
          }
        }
      }
    }

    return fieldMap;
  }
}

export default FieldOperations;