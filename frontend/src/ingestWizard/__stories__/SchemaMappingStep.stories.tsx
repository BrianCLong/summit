import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import SchemaMappingStep from '../components/SchemaMappingStep';
import { SchemaMappingState } from '../types';

const baseState: SchemaMappingState = {
  sourceSample: [
    { name: 'full_name', type: 'string', example: 'Jane Doe' },
    { name: 'email', type: 'string', example: 'jane@example.com' },
    { name: 'country', type: 'string', example: 'US' }
  ],
  targetSchema: [
    { name: 'person_name', type: 'string', required: true },
    { name: 'contact_email', type: 'string' },
    { name: 'residency', type: 'string' }
  ],
  mappings: [],
  autoMappedFields: ['full_name']
};

const meta: Meta<typeof SchemaMappingStep> = {
  title: 'Ingest Wizard/SchemaMappingStep',
  component: SchemaMappingStep,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

type Story = StoryObj<typeof SchemaMappingStep>;

export const Empty: Story = {
  render: () => {
    const [value, setValue] = useState(baseState);
    return <SchemaMappingStep value={value} onChange={setValue} />;
  }
};

export const WithMappings: Story = {
  render: () => {
    const [value, setValue] = useState<SchemaMappingState>({
      ...baseState,
      mappings: [
        { id: '1', sourceField: 'full_name', targetField: 'person_name', required: true },
        { id: '2', sourceField: 'email', targetField: 'contact_email' }
      ]
    });
    return <SchemaMappingStep value={value} onChange={setValue} />;
  }
};
