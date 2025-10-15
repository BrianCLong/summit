import type { Meta, StoryObj } from '@storybook/react';
import ValidationStep from '../components/ValidationStep';
import { SchemaMappingState } from '../types';

const schemaMapping: SchemaMappingState = {
  sourceSample: [],
  targetSchema: [],
  mappings: [
    { id: '1', sourceField: 'full_name', targetField: 'person_name', required: true },
    { id: '2', sourceField: 'email', targetField: 'contact_email' }
  ],
  autoMappedFields: []
};

const meta: Meta<typeof ValidationStep> = {
  title: 'Ingest Wizard/ValidationStep',
  component: ValidationStep,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

type Story = StoryObj<typeof ValidationStep>;

export const NoIssues: Story = {
  args: {
    dataSource: {
      name: 'Sanctions feed',
      source_type: 'csv',
      retention_period: 90,
      tos_accepted: true
    },
    schemaMapping,
    validation: {
      status: 'passed',
      issues: [],
      lastRun: new Date().toISOString()
    }
  }
};

export const WithWarnings: Story = {
  args: {
    dataSource: {
      name: 'OSINT stream',
      source_type: 'api',
      retention_period: 45,
      tos_accepted: false
    },
    schemaMapping,
    validation: {
      status: 'failed',
      issues: [
        {
          id: 'tos',
          severity: 'warning',
          message: 'Terms of service acknowledgement is missing.',
          suggestion: 'Review provider agreement and check the acknowledgement box.'
        },
        {
          id: 'mapping-empty',
          severity: 'error',
          message: 'At least one mandatory canonical field is not mapped.'
        }
      ],
      lastRun: new Date().toISOString()
    }
  }
};
