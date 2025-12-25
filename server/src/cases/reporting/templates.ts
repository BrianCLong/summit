import { ReportTemplate } from '../../reporting/types.js';

/**
 * Investigating Summary Template
 * Used as the default template for case exports
 */
export const INVESTIGATION_SUMMARY_TEMPLATE: ReportTemplate = {
    id: 'INVESTIGATION_SUMMARY',
    name: 'Investigation Summary Report',
    description: 'A comprehensive overview of investigation findings',
    content: `
# Investigation Summary: {{title}}
Status: {{status}}
Severity: {{severity}}

## Executive Summary
{{summary}}

## Key Entities
{{entities}}

## Timeline
{{timeline}}
  `,
    format: 'docx',
    defaultWatermark: 'FOR OFFICIAL USE ONLY'
};
