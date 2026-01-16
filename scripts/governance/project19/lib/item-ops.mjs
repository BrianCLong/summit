/**
 * Item Operations Library
 * Handles operations on GitHub Project items (finding, updating, linking to content)
 */

import { stableId, stableSort, sortObjectKeys } from './determinism.mjs';
import GitHubGraphQLClient from './github-graphql.mjs';

class ItemOperations {
  constructor(token) {
    this.client = new GitHubGraphQLClient(token);
  }

  /**
   * Find the project item associated with a GitHub issue or PR
   */
  async findProjectItemForContent(projectId, contentId) {
    // This is a simplified version - in real implementation, would use GraphQL to find by content ID
    try {
      // Simulate a GraphQL query to find item by content ID
      // In real implementation, this would make the actual API call
      return {
        id: stableId(['item', projectId, contentId]),
        content: { id: contentId },
        fields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(`Could not find project item for content ${contentId}:`, error.message);
      return null;
    }
  }

  /**
   * Find all project items for a given project
   */
  async findAllProjectItems(projectId) {
    // Return mock data structure - would be replaced with real GraphQL calls
    return [
      {
        id: "PVTI_lADOA6AIQLY4tgEwzgFNXY0",
        content: {
          id: "I_kwDOA6AIQLc5J7p0",
          number: 123,
          title: "Sample issue",
          url: "https://github.com/BrianCLong/summit/issues/123"
        },
        fields: {
          "Status": "In Progress",
          "Phase": "Foundation",
          "Priority": "P1",
          "Release": "Alpha",
          "Governance Gate": "Design",
          "Gate Status": "In Review",
          "Evidence Required": "No",
          "Evidence Complete": "No",
        }
      }
    ];
  }

  /**
   * Update a project item's field value
   */
  async updateProjectItemField(projectId, itemId, fieldId, value, valueType = 'text') {
    try {
      // In real implementation, this would make the actual GraphQL mutation
      return await this.client.updateProjectItemField(projectId, itemId, fieldId, value, valueType);
    } catch (error) {
      console.error(`Failed to update field for item ${itemId}:`, error.message);
      throw error;
    }
  }

  /**
   * Batch update multiple project items
   */
  async batchUpdateItems(projectId, updates) {
    const results = [];

    for (const { itemId, fieldUpdates } of updates) {
      const itemResults = [];
      
      for (const [fieldName, { value, valueType }] of Object.entries(fieldUpdates)) {
        try {
          // In real implementation, this would map fieldName to fieldId
          // For now, we'll use a placeholder fieldId
          const fieldId = stableId(['field', fieldName]);
          
          const result = await this.updateProjectItemField(
            projectId,
            itemId,
            fieldId,
            value,
            valueType || getFieldType(fieldName)
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
      
      results.push({
        itemId,
        updates: itemResults
      });
    }

    return results;
  }

  /**
   * Add an issue or PR to a project
   */
  async addContentToProject(projectId, contentId) {
    try {
      // In real implementation, this would make the actual GraphQL mutation
      return {
        id: stableId(['item', projectId, contentId]),
        contentId,
        addedAt: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error(`Failed to add content ${contentId} to project ${projectId}:`, error.message);
      return {
        contentId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transform raw project item data to standardized format
   */
  transformItemData(rawItem) {
    const transformed = {
      id: rawItem.id,
      content: rawItem.content ? {
        id: rawItem.content.id,
        number: rawItem.content.number,
        title: rawItem.content.title,
        url: rawItem.content.url,
        type: rawItem.content.__typename || 'Unknown'
      } : null,
      fields: {},
      createdAt: rawItem.createdAt,
      updatedAt: rawItem.updatedAt
    };

    // Transform field values from GraphQL structure
    if (rawItem.fieldValues?.nodes) {
      for (const fieldValue of rawItem.fieldValues.nodes) {
        if (fieldValue?.field?.name) {
          const fieldName = fieldValue.field.name;
          
          // Extract value based on field type
          let value;
          if (fieldValue.__typename === 'ProjectV2ItemFieldSingleSelectValue') {
            value = fieldValue.name; // Selected option name
          } else if (fieldValue.__typename === 'ProjectV2ItemFieldTextValue') {
            value = fieldValue.text;
          } else if (fieldValue.__typename === 'ProjectV2ItemFieldNumberValue') {
            value = fieldValue.number;
          } else if (fieldValue.__typename === 'ProjectV2ItemFieldDateValue') {
            value = fieldValue.date;
          } else if (fieldValue.__typename === 'ProjectV2ItemFieldIterationValue') {
            value = fieldValue.title; // Iteration title
          } else if (fieldValue.__typename === 'ProjectV2ItemFieldUserValue') {
            // Convert users array to login names
            value = (fieldValue.users?.nodes || []).map(u => u.login);
          } else {
            // For unknown field types, store the raw value object
            value = fieldValue;
          }
          
          transformed.fields[fieldName] = value;
        }
      }
    }

    return transformed;
  }

  /**
   * Create change summary between two item states
   */
  createChangeSummary(previousItems, currentItems) {
    const changes = {
      created: [],
      updated: [],
      unchanged: [],
      deleted: [],
      total: currentItems.length
    };

    // Create maps for comparing
    const previousMap = new Map(previousItems.map(item => [item.id, item]));
    const currentMap = new Map(currentItems.map(item => [item.id, item]));

    // Find items that were updated or remained unchanged
    for (const [id, currentItem] of currentMap) {
      const previousItem = previousMap.get(id);
      
      if (!previousItem) {
        changes.created.push(currentItem);
      } else if (this.itemsChanged(previousItem, currentItem)) {
        changes.updated.push({
          id,
          previous: previousItem,
          current: currentItem,
          changes: this.computeFieldChanges(previousItem, currentItem)
        });
      } else {
        changes.unchanged.push(currentItem);
      }
    }

    // Find items that were deleted
    for (const [id, previousItem] of previousMap) {
      if (!currentMap.has(id)) {
        changes.deleted.push(previousItem);
      }
    }

    return changes;
  }

  /**
   * Check if two items have meaningful changes
   */
  itemsChanged(item1, item2) {
    // Compare field values to detect meaningful changes
    // Use deterministic comparison (sorted keys)
    const fields1 = sortObjectKeys(item1.fields || {});
    const fields2 = sortObjectKeys(item2.fields || {});
    
    return JSON.stringify(fields1) !== JSON.stringify(fields2);
  }

  /**
   * Compute specific field changes between two items
   */
  computeFieldChanges(item1, item2) {
    const changes = [];
    const allFieldNames = new Set([
      ...Object.keys(item1.fields || {}),
      ...Object.keys(item2.fields || {})
    ]);
    
    for (const fieldName of allFieldNames) {
      const value1 = (item1.fields || {})[fieldName];
      const value2 = (item2.fields || {})[fieldName];
      
      if (value1 !== value2) {
        changes.push({
          field: fieldName,
          previous: value1,
          current: value2,
          type: this.inferChangeType(value1, value2)
        });
      }
    }
    
    return changes;
  }

  /**
   * Infer the type of field change
   */
  inferChangeType(prevValue, currentValue) {
    if (prevValue === undefined) return 'addition';
    if (currentValue === undefined) return 'removal';
    return 'modification';
  }

  /**
   * Save items to file for audit/debugging
   */
  saveItemsToFile(items, filepath, metadata = {}) {
    const data = {
      timestamp: new Date().toISOString(),
      itemCount: items.length,
      metadata,
      items: items.map(item => this.transformItemData(item))
    };
    
    // Ensure directory exists
    const dir = filepath.substring(0, filepath.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }

  /**
   * Load items from file
   */
  loadItemsFromFile(filepath) {
    if (!fs.existsSync(filepath)) {
      throw new Error(`File not found: ${filepath}`);
    }
    
    const content = fs.readFileSync(filepath, 'utf8');
    const data = JSON.parse(content);
    
    return {
      items: data.items,
      metadata: data.metadata,
      timestamp: data.timestamp
    };
  }
}

/**
 * Helper function to determine field type based on name
 */
function getFieldType(fieldName) {
  const lowerField = fieldName.toLowerCase();
  
  if (lowerField.includes('select')) return 'single_select';
  if (lowerField.includes('number')) return 'number';
  if (lowerField.includes('date')) return 'date';
  if (lowerField.includes('complete') || lowerField.includes('required')) return 'checkbox';
  if (lowerField.includes('status') || lowerField.includes('gate')) return 'single_select';
  if (lowerField.includes('class') || lowerField.includes('type')) return 'single_select';
  if (lowerField.includes('count') || lowerField.includes('score')) return 'number';
  
  return 'text'; // Default
}

export default ItemOperations;