import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import DataSourceSelection from '../components/DataSourceSelection';
import { DataSourceConfig } from '../types';

const meta: Meta<typeof DataSourceSelection> = {
  title: 'Ingest Wizard/DataSourceSelection',
  component: DataSourceSelection,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

type Story = StoryObj<typeof DataSourceSelection>;

const Template = (initialValue: Partial<DataSourceConfig>) => {
  const [value, setValue] = useState(initialValue);
  return <DataSourceSelection value={value} onChange={setValue} />;
};

export const Empty: Story = {
  render: () => Template({})
};

export const Prefilled: Story = {
  render: () =>
    Template({
      name: 'Sanctions feed',
      source_type: 'csv',
      license_template: 'cc-by-4.0',
      retention_period: 180,
      geographic_restrictions: ['US', 'EU'],
      tos_accepted: true
    })
};
