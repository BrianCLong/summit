"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVESTIGATION_SUMMARY_TEMPLATE = void 0;
/**
 * Investigating Summary Template
 * Used as the default template for case exports
 */
exports.INVESTIGATION_SUMMARY_TEMPLATE = {
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
