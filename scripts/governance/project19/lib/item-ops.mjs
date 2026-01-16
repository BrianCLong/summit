/**
 * Item Operations
 * Handles operations on GitHub Project items (updating fields, linking to issues, etc.)
 */

import GitHubGraphQLClient from './github-graphql.mjs';
import { stableId, sortObjectKeys } from './determinism.mjs';

class ItemOperations {
  constructor(token) {
    this.client = new GitHubGraphQLClient(token);
  }

  /**
   * Find the project item associated with a GitHub issue or PR
   */
  async findProjectItemForContent(projectId, contentId) {
    const query = `
      query FindProjectItemForContent($projectId: ID!, $contentId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 1, query: "content:$contentId") {
              nodes {
                id
                content {
                  ... on Issue { 
                    id
                    number
                    title
                    url
                  }
                  ... on PullRequest { 
                    id
                    number
                    title
                    url
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await this.client.query(query, { projectId, contentId });
    
    if (result.node.items.nodes.length > 0) {
      return result.node.items.nodes[0];
    }
    
    return null;
  }

  /**
   * Find all project items for a given project
   */
  async findAllProjectItems(projectId) {
    let allItems = [];
    let hasMore = true;
    let cursor = null;

    while (hasMore) {
      const query = `
        query FindAllProjectItems($projectId: ID!, $first: Int!, $after: String) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: $first, after: $after) {
                nodes {
                  id
                  content {
                    ... on Issue {
                      id
                      number
                      title
                      url
                    }
                    ... on PullRequest {
                      id
                      number
                      title
                      url
                    }
                  }
                  fieldValues(first: 50) {
                    nodes {
                      ... on ProjectV2ItemFieldTextValue {
                        text
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                            id
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                            id
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldNumberValue {
                        number
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                            id
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldDateValue {
                        date
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                            id
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldIterationValue {
                        title
                        field {
                          ... on ProjectV2IterationField {
                            name
                            id
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldUserValue {
                        users(first: 10) {
                          nodes {
                            login
                          }
                        }
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                            id
                          }
                        }
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `;

      const result = await this.client.query(query, { 
        projectId, 
        first: 100, 
        after: cursor 
      });

      const projectNode = result.node;
      const itemsData = projectNode.items;

      allItems = allItems.concat(itemsData.nodes);
      hasMore = itemsData.pageInfo.hasNextPage;
      cursor = itemsData.pageInfo.endCursor;
    }

    return allItems;
  }

  /**
   * Update a project item's field value
   */
  async updateProjectItemField(projectId, itemId, fieldId, value, valueType = 'text') {
    let fieldValueInput;

    // Determine the correct input type based on the value type
    switch (valueType) {
      case 'single_select':
        fieldValueInput = { singleSelectOptionId: value };
        break;
      case 'multi_select':
        fieldValueInput = { multiSelectOptionIds: Array.isArray(value) ? value : [value] };
        break;
      case 'text':
        fieldValueInput = { text: String(value) };
        break;
      case 'number':
        fieldValueInput = { number: Number(value) };
        break;
      case 'date':
        fieldValueInput = { date: String(value) }; // Format: YYYY-MM-DD
        break;
      case 'iteration':
        fieldValueInput = { iterationId: value };
        break;
      case 'checkbox':
        fieldValueInput = { checked: Boolean(value) };
        break;
      default:
        throw new Error(`Unsupported value type: ${valueType}`);
    }

    const mutation = `
      mutation UpdateProjectItemField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: $value
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `;

    const variables = {
      projectId,
      itemId,
      fieldId,
      value: fieldValueInput
    };

    return this.client.query(mutation, variables);
  }

  /**
   * Add an issue or PR to a project
   */
  async addContentToProject(projectId, contentId) {
    const mutation = `
      mutation AddContentToProject($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
          item {
            id
            content {
              ... on Issue { 
                id 
                title 
              }
              ... on PullRequest { 
                id 
                title 
              }
            }
          }
        }
      }
    `;

    return this.client.query(mutation, { projectId, contentId });
  }

  /**
   * Transform raw project item data to a standardized format
   */
  transformItemData(rawItem) {
    const transformed = {
      id: rawItem.id,
      content: {
        id: rawItem.content?.id || null,
        number: rawItem.content?.number || null,
        title: rawItem.content?.title || null,
        url: rawItem.content?.url || null,
        type: rawItem.content ? (rawItem.content.number !== undefined ? 'Issue' : 'PullRequest') : null
      },
      fields: {}
    };

    // Transform field values
    if (rawItem.fieldValues?.nodes) {
      for (const fieldValue of rawItem.fieldValues.nodes) {
        if (fieldValue.field) {
          const fieldName = fieldValue.field.name;
          
          // Extract the actual value based on field type
          let value;
          if (fieldValue.__typename === 'ProjectV2ItemFieldSingleSelectValue') {
            value = fieldValue.name;
          } else if (fieldValue.__typename === 'ProjectV2ItemFieldTextValue') {
            value = fieldValue.text;
          } else if (fieldValue.__typename === 'ProjectV2ItemFieldNumberValue') {
            value = fieldValue.number;
          } else if (fieldValue.__typename === 'ProjectV2ItemFieldDateValue') {
            value = fieldValue.date;
          } else if (fieldValue.__typename === 'ProjectV2ItemFieldIterationValue') {
            value = fieldValue.title;
          } else if (fieldValue.__typename === 'ProjectV2ItemFieldUserValue') {
            value = fieldValue.users?.nodes?.map(user => user.login) || [];
          } else {
            // For other types, use the raw value object
            value = fieldValue;
          }
          
          transformed.fields[fieldName] = value;
        }
      }
    }

    return transformed;
  }

  /**
   * Batch update multiple items with field values
   */
  async batchUpdateItems(projectId, updates) {
    const results = [];

    for (const { itemId, fieldUpdates } of updates) {
      const itemResults = [];
      
      for (const [fieldName, { value, valueType }] of Object.entries(fieldUpdates)) {
        try {
          // We need to map field name to field ID
          const fieldMap = await this.getFieldMapForProject(projectId);
          const fieldId = fieldMap.fields[fieldName];
          
          if (!fieldId) {
            throw new Error(`Field ${fieldName} not found in project`);
          }

          const result = await this.updateProjectItemField(
            projectId, 
            itemId, 
            fieldId, 
            value, 
            valueType
          );
          
          itemResults.push({ 
            field: fieldName, 
            success: true, 
            result 
          });
        } catch (error) {
          itemResults.push({ 
            field: fieldName, 
            success: false, 
            error: error.message 
          });
        }
      }
      
      results.push({ itemId, updates: itemResults });
    }

    return results;
  }

  /**
   * Get field mapping for a project (field names to IDs)
   */
  async getFieldMapForProject(projectId) {
    const query = `
      query GetProjectFields($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
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
              }
            }
          }
        }
      }
    `;

    const result = await this.client.query(query, { projectId });
    
    const fieldMap = {
      fields: {},
      singleSelectOptions: {},
      multiSelectOptions: {}
    };

    for (const field of result.node.fields.nodes) {
      fieldMap.fields[field.name] = field.id;
      
      // Map options for selection fields
      if (field.options) {
        if (field.__typename === 'ProjectV2SingleSelectField') {
          fieldMap.singleSelectOptions[field.name] = {};
          for (const option of field.options) {
            fieldMap.singleSelectOptions[field.name][option.name] = option.id;
          }
        } else if (field.__typename === 'ProjectV2MultipleSelectField') {
          fieldMap.multiSelectOptions[field.name] = {};
          for (const option of field.options) {
            fieldMap.multiSelectOptions[field.name][option.name] = option.id;
          }
        }
      }
    }

    return fieldMap;
  }

  /**
   * Normalize item data for consistent processing
   */
  normalizeItemData(item) {
    // Ensure all fields have consistent types
    const normalized = {
      ...item,
      fields: {}
    };

    for (const [fieldName, value] of Object.entries(item.fields || {})) {
      // Convert numbers, dates, and booleans as appropriate
      if (typeof value === 'string') {
        // Try to parse as number
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && value.trim() !== '') {
          normalized.fields[fieldName] = numValue;
        } else {
          // Try to parse as date
          const dateValue = new Date(value);
          if (!isNaN(dateValue.getTime())) {
            normalized.fields[fieldName] = dateValue.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          } else {
            normalized.fields[fieldName] = value;
          }
        }
      } else {
        normalized.fields[fieldName] = value;
      }
    }

    return normalized;
  }

  /**
   * Create a summary of item changes for reporting
   */
  createChangeSummary(previousItems, currentItems) {
    const changes = {
      created: [],
      updated: [],
      unchanged: [],
      deleted: [],
      total: currentItems.length
    };

    const previousMap = new Map(previousItems.map(item => [item.id, item]));
    const currentMap = new Map(currentItems.map(item => [item.id, item]));

    // Check for updates and deletions
    for (const [id, prevItem] of previousMap) {
      if (!currentMap.has(id)) {
        changes.deleted.push(prevItem);
      } else {
        const currentItem = currentMap.get(id);
        if (this.itemsChanged(prevItem, currentItem)) {
          changes.updated.push({
            id,
            previous: prevItem,
            current: currentItem
          });
        } else {
          changes.unchanged.push(currentItem);
        }
      }
    }

    // Check for new items
    for (const [id, currentItem] of currentMap) {
      if (!previousMap.has(id)) {
        changes.created.push(currentItem);
      }
    }

    return changes;
  }

  /**
   * Check if two items have meaningful changes
   */
  itemsChanged(item1, item2) {
    // For simplicity, just compare field values
    // In a real implementation, we might want to ignore certain fields or timestamp changes
    return JSON.stringify(sortObjectKeys(item1.fields)) !== 
           JSON.stringify(sortObjectKeys(item2.fields));
  }

  /**
   * Save item data to a file for debugging or reporting
   */
  saveItemsToFile(items, filepath) {
    const data = {
      timestamp: new Date().toISOString(),
      itemCount: items.length,
      items: items.map(item => this.transformItemData(item))
    };
    
    // Ensure directory exists
    const dir = filepath.substring(0, filepath.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }
}

export default ItemOperations;