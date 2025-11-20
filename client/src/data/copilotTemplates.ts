/**
 * AI Copilot Query Templates
 *
 * Pre-built query templates for common investigation patterns.
 * Templates use {{variable}} syntax for parameterization.
 */

import type { QueryTemplate } from '../types/copilot';

export const copilotTemplates: QueryTemplate[] = [
  // ========================================================================
  // Entity Discovery
  // ========================================================================
  {
    id: 'find-persons',
    name: 'Find All Persons',
    description: 'Retrieve all person entities in the investigation',
    category: 'Entity Discovery',
    template: 'Show me all persons in this investigation',
    examples: [
      'Show me all persons in this investigation',
      'Find all people',
      'List all persons',
    ],
  },
  {
    id: 'find-high-confidence',
    name: 'High Confidence Entities',
    description: 'Find entities with confidence score above threshold',
    category: 'Entity Discovery',
    template: 'Show me all {{entityType}} entities with confidence greater than {{threshold}}',
    variables: [
      {
        name: 'entityType',
        type: 'entityType',
        description: 'Type of entity to search for',
        required: true,
        defaultValue: 'Person',
      },
      {
        name: 'threshold',
        type: 'number',
        description: 'Minimum confidence score (0-1)',
        required: true,
        defaultValue: 0.8,
      },
    ],
    examples: [
      'Show me all Person entities with confidence greater than 0.8',
      'Show me all Organization entities with confidence greater than 0.9',
    ],
  },
  {
    id: 'recent-entities',
    name: 'Recently Added Entities',
    description: 'Find entities added in the last N days',
    category: 'Entity Discovery',
    template: 'Show me all entities added in the last {{days}} days',
    variables: [
      {
        name: 'days',
        type: 'number',
        description: 'Number of days to look back',
        required: true,
        defaultValue: 7,
      },
    ],
    examples: [
      'Show me all entities added in the last 7 days',
      'Show me all entities added in the last 30 days',
    ],
  },

  // ========================================================================
  // Relationship Analysis
  // ========================================================================
  {
    id: 'connected-entities',
    name: 'Connected Entities',
    description: 'Find entities connected to a specific entity type',
    category: 'Relationships',
    template: 'Show me all {{sourceType}} entities connected to {{targetType}} entities',
    variables: [
      {
        name: 'sourceType',
        type: 'entityType',
        description: 'Source entity type',
        required: true,
        defaultValue: 'Person',
      },
      {
        name: 'targetType',
        type: 'entityType',
        description: 'Target entity type',
        required: true,
        defaultValue: 'Organization',
      },
    ],
    examples: [
      'Show me all Person entities connected to Organization entities',
      'Show me all Person entities connected to Financial entities',
    ],
  },
  {
    id: 'highly-connected',
    name: 'Highly Connected Entities',
    description: 'Find entities with many connections (network hubs)',
    category: 'Relationships',
    template: 'Show me all entities with more than {{minConnections}} connections',
    variables: [
      {
        name: 'minConnections',
        type: 'number',
        description: 'Minimum number of connections',
        required: true,
        defaultValue: 5,
      },
    ],
    examples: [
      'Show me all entities with more than 5 connections',
      'Show me all entities with more than 10 connections',
    ],
  },
  {
    id: 'relationship-type',
    name: 'Specific Relationship Type',
    description: 'Find entities connected by a specific relationship',
    category: 'Relationships',
    template: 'Show me all entities connected by {{relationshipType}} relationships',
    variables: [
      {
        name: 'relationshipType',
        type: 'string',
        description: 'Type of relationship',
        required: true,
        defaultValue: 'WORKS_FOR',
      },
    ],
    examples: [
      'Show me all entities connected by WORKS_FOR relationships',
      'Show me all entities connected by TRANSFERRED relationships',
    ],
  },

  // ========================================================================
  // Financial Analysis
  // ========================================================================
  {
    id: 'financial-transfers',
    name: 'Financial Transfers',
    description: 'Find persons who transferred money to specific account types',
    category: 'Financial',
    template: 'Show me all persons who transferred money to {{accountType}} accounts',
    variables: [
      {
        name: 'accountType',
        type: 'string',
        description: 'Type of account (offshore, domestic, etc.)',
        required: true,
        defaultValue: 'offshore',
      },
    ],
    examples: [
      'Show me all persons who transferred money to offshore accounts',
      'Show me all persons who transferred money to foreign accounts',
    ],
  },
  {
    id: 'large-transactions',
    name: 'Large Transactions',
    description: 'Find transactions above a certain amount',
    category: 'Financial',
    template: 'Show me all transactions greater than {{amount}} dollars',
    variables: [
      {
        name: 'amount',
        type: 'number',
        description: 'Minimum transaction amount',
        required: true,
        defaultValue: 50000,
      },
    ],
    examples: [
      'Show me all transactions greater than 50000 dollars',
      'Show me all transactions greater than 100000 dollars',
    ],
  },
  {
    id: 'financial-connections',
    name: 'Financial Entity Connections',
    description: 'Find persons connected to financial entities',
    category: 'Financial',
    template: 'Show me all persons connected to financial entities',
    examples: [
      'Show me all persons connected to financial entities',
      'Find people linked to banks or financial institutions',
    ],
  },

  // ========================================================================
  // Temporal Analysis
  // ========================================================================
  {
    id: 'recent-activity',
    name: 'Recent Activity',
    description: 'Find entities or relationships in a time window',
    category: 'Temporal',
    template: 'Show me all {{entityType}} entities active in the last {{days}} days',
    variables: [
      {
        name: 'entityType',
        type: 'entityType',
        description: 'Type of entity',
        required: false,
      },
      {
        name: 'days',
        type: 'number',
        description: 'Number of days to look back',
        required: true,
        defaultValue: 30,
      },
    ],
    examples: [
      'Show me all entities active in the last 30 days',
      'Show me all Person entities active in the last 7 days',
    ],
  },
  {
    id: 'date-range',
    name: 'Date Range Query',
    description: 'Find entities or events within a specific date range',
    category: 'Temporal',
    template: 'Show me all {{entityType}} entities between {{startDate}} and {{endDate}}',
    variables: [
      {
        name: 'entityType',
        type: 'entityType',
        description: 'Type of entity',
        required: false,
      },
      {
        name: 'startDate',
        type: 'date',
        description: 'Start date',
        required: true,
      },
      {
        name: 'endDate',
        type: 'date',
        description: 'End date',
        required: true,
      },
    ],
    examples: [
      'Show me all entities between 2024-01-01 and 2024-06-30',
      'Show me all Person entities between January 2024 and June 2024',
    ],
  },

  // ========================================================================
  // Suspicious Activity
  // ========================================================================
  {
    id: 'suspicious-entities',
    name: 'Suspicious Entities',
    description: 'Find entities flagged as suspicious',
    category: 'Suspicious Activity',
    template: 'Show me all entities flagged as suspicious',
    examples: [
      'Show me all entities flagged as suspicious',
      'Find suspicious entities',
      'What entities are marked suspicious?',
    ],
  },
  {
    id: 'anomalous-patterns',
    name: 'Anomalous Patterns',
    description: 'Find entities with unusual activity patterns',
    category: 'Suspicious Activity',
    template: 'Show me all entities with unusual {{activityType}} patterns',
    variables: [
      {
        name: 'activityType',
        type: 'string',
        description: 'Type of activity to analyze',
        required: true,
        defaultValue: 'communication',
      },
    ],
    examples: [
      'Show me all entities with unusual communication patterns',
      'Show me all entities with unusual financial patterns',
    ],
  },
  {
    id: 'flagged-documents',
    name: 'Flagged Documents',
    description: 'Find entities connected to flagged documents',
    category: 'Suspicious Activity',
    template: 'Show me all entities connected to flagged or suspicious documents',
    examples: [
      'Show me all entities connected to flagged documents',
      'Find people linked to suspicious documents',
    ],
  },

  // ========================================================================
  // Network Analysis
  // ========================================================================
  {
    id: 'shortest-path',
    name: 'Shortest Path Between Entities',
    description: 'Find the shortest connection between two entities',
    category: 'Network Analysis',
    template: 'What is the shortest path between {{entity1}} and {{entity2}}',
    variables: [
      {
        name: 'entity1',
        type: 'string',
        description: 'First entity name or ID',
        required: true,
      },
      {
        name: 'entity2',
        type: 'string',
        description: 'Second entity name or ID',
        required: true,
      },
    ],
    examples: [
      'What is the shortest path between John Doe and Jane Smith',
      'How are John Doe and Acme Corp connected',
    ],
  },
  {
    id: 'central-entities',
    name: 'Central Network Entities',
    description: 'Find the most central/important entities in the network',
    category: 'Network Analysis',
    template: 'What are the most central entities in this investigation',
    examples: [
      'What are the most central entities in this investigation',
      'Find the network hubs',
      'Who are the key players',
    ],
  },
  {
    id: 'common-connections',
    name: 'Common Connections',
    description: 'Find entities that share connections',
    category: 'Network Analysis',
    template: 'Show me all entities that share connections with {{entityName}}',
    variables: [
      {
        name: 'entityName',
        type: 'string',
        description: 'Entity to find common connections for',
        required: true,
      },
    ],
    examples: [
      'Show me all entities that share connections with John Doe',
      'Find people who know the same people as Jane Smith',
    ],
  },

  // ========================================================================
  // Geographic Analysis
  // ========================================================================
  {
    id: 'location-entities',
    name: 'Entities in Location',
    description: 'Find entities in a specific location',
    category: 'Geographic',
    template: 'Show me all {{entityType}} entities in {{location}}',
    variables: [
      {
        name: 'entityType',
        type: 'entityType',
        description: 'Type of entity',
        required: false,
      },
      {
        name: 'location',
        type: 'string',
        description: 'Location name',
        required: true,
      },
    ],
    examples: [
      'Show me all Person entities in New York',
      'Show me all entities in San Francisco',
    ],
  },
  {
    id: 'international-connections',
    name: 'International Connections',
    description: 'Find entities with international connections',
    category: 'Geographic',
    template: 'Show me all entities with connections to {{country}}',
    variables: [
      {
        name: 'country',
        type: 'string',
        description: 'Country name',
        required: true,
      },
    ],
    examples: [
      'Show me all entities with connections to Russia',
      'Show me all entities with connections to China',
    ],
  },

  // ========================================================================
  // Data Quality
  // ========================================================================
  {
    id: 'incomplete-entities',
    name: 'Incomplete Entities',
    description: 'Find entities with missing or incomplete data',
    category: 'Data Quality',
    template: 'Show me all entities with missing or incomplete information',
    examples: [
      'Show me all entities with missing information',
      'Find incomplete entity records',
      'What entities need more data',
    ],
  },
  {
    id: 'low-confidence',
    name: 'Low Confidence Entities',
    description: 'Find entities that may need verification',
    category: 'Data Quality',
    template: 'Show me all entities with confidence less than {{threshold}}',
    variables: [
      {
        name: 'threshold',
        type: 'number',
        description: 'Maximum confidence score',
        required: true,
        defaultValue: 0.5,
      },
    ],
    examples: [
      'Show me all entities with confidence less than 0.5',
      'Find low-confidence entities that need verification',
    ],
  },
  {
    id: 'duplicate-entities',
    name: 'Potential Duplicates',
    description: 'Find entities that may be duplicates',
    category: 'Data Quality',
    template: 'Show me all entities that might be duplicates',
    examples: [
      'Show me all entities that might be duplicates',
      'Find potential duplicate entities',
      'What entities look like duplicates',
    ],
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): QueryTemplate[] {
  return copilotTemplates.filter((t) => t.category === category);
}

/**
 * Get all unique categories
 */
export function getTemplateCategories(): string[] {
  return Array.from(new Set(copilotTemplates.map((t) => t.category)));
}

/**
 * Search templates by keyword
 */
export function searchTemplates(keyword: string): QueryTemplate[] {
  const lowerKeyword = keyword.toLowerCase();
  return copilotTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerKeyword) ||
      t.description.toLowerCase().includes(lowerKeyword) ||
      t.template.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): QueryTemplate | undefined {
  return copilotTemplates.find((t) => t.id === id);
}
