/**
 * Mock report templates for testing
 */

import type { ReportTemplate } from '../../../services/reporting/types/Template.js';

export const mockInvestigationSummaryTemplate: ReportTemplate = {
  id: 'INVESTIGATION_SUMMARY',
  name: 'Investigation Summary Report',
  description: 'A comprehensive overview of investigation findings',
  category: 'INVESTIGATION',
  sections: [
    'executive_summary',
    'investigation_timeline',
    'key_entities',
    'relationship_analysis',
    'evidence_summary',
    'findings_conclusions',
    'recommendations',
  ],
  parameters: [
    { name: 'investigationId', type: 'string', required: true },
    { name: 'includeClassifiedData', type: 'boolean', default: false },
    {
      name: 'summaryLevel',
      type: 'enum',
      options: ['brief', 'detailed', 'comprehensive'],
      default: 'detailed',
    },
    { name: 'timeRange', type: 'daterange', required: false },
  ],
  outputFormats: ['PDF', 'DOCX', 'HTML', 'JSON'],
  estimatedTime: 120000,
  accessLevel: 'ANALYST',
};

export const mockEntityAnalysisTemplate: ReportTemplate = {
  id: 'ENTITY_ANALYSIS',
  name: 'Entity Analysis Report',
  description: 'Deep-dive analysis of a single entity',
  category: 'ENTITY',
  sections: [
    'entity_overview',
    'connection_analysis',
    'risk_assessment',
    'activity_timeline',
  ],
  parameters: [
    { name: 'entityId', type: 'string', required: true },
    { name: 'includeConnections', type: 'boolean', default: true },
  ],
  outputFormats: ['PDF', 'DOCX', 'HTML', 'JSON'],
  estimatedTime: 60000,
  accessLevel: 'ANALYST',
};

export const mockNetworkAnalysisTemplate: ReportTemplate = {
  id: 'NETWORK_ANALYSIS',
  name: 'Network Analysis Report',
  description: 'Social network analysis with community detection',
  category: 'ANALYSIS',
  sections: [
    'network_overview',
    'network_topology',
    'centrality_analysis',
    'community_detection',
    'key_players',
  ],
  parameters: [
    { name: 'investigationId', type: 'string', required: true },
    {
      name: 'analysisType',
      type: 'enum',
      options: ['full', 'communities', 'influence', 'flows'],
      default: 'full',
    },
    { name: 'includeVisualization', type: 'boolean', default: true },
  ],
  outputFormats: ['PDF', 'HTML', 'JSON', 'GEPHI'],
  estimatedTime: 300000,
  accessLevel: 'SENIOR_ANALYST',
};

export const mockAllTemplates: ReportTemplate[] = [
  mockInvestigationSummaryTemplate,
  mockEntityAnalysisTemplate,
  mockNetworkAnalysisTemplate,
];
