import type { Meta, StoryObj } from '@storybook/react';
import { DataPreviewTable, DataPreviewRow } from '../DataPreviewTable';

const sampleColumns = ['id', 'name', 'email', 'active'];
const sampleRows: DataPreviewRow[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
  { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', active: true }
];

const meta: Meta<typeof DataPreviewTable> = {
  title: 'Ingest Wizard/Data Preview Table',
  component: DataPreviewTable,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

type Story = StoryObj<typeof DataPreviewTable>;

export const CSVPreview: Story = {
  args: {
    columns: sampleColumns,
    rows: sampleRows,
    totalRows: 30,
    isTruncated: false
  }
};

const jsonRows: DataPreviewRow[] = [
  { id: 'a-001', metadata: '{"region":"EMEA","priority":1}', status: 'ready' },
  { id: 'a-002', metadata: '{"region":"APAC","priority":2}', status: 'processing' }
];

export const JSONPreview: Story = {
  args: {
    columns: ['id', 'metadata', 'status'],
    rows: jsonRows,
    totalRows: 2,
    isTruncated: false
  }
};

export const EmptyState: Story = {
  args: {
    columns: sampleColumns,
    rows: [],
    totalRows: 0,
    emptyMessage: 'No preview rows returned. Adjust your filters and try again.'
  }
};
