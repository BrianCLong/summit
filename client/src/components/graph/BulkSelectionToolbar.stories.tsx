import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import BulkSelectionToolbar from './BulkSelectionToolbar';

const meta: Meta<typeof BulkSelectionToolbar> = {
  title: 'Graph/BulkSelectionToolbar',
  component: BulkSelectionToolbar,
  args: {
    nodeCount: 3,
    edgeCount: 2,
    selectionMode: true,
    onToggleSelectionMode: fn(),
    onDelete: fn(),
    onClear: fn(),
    loading: false,
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<typeof BulkSelectionToolbar>;

export const Default: Story = {};

export const NothingSelected: Story = {
  args: {
    nodeCount: 0,
    edgeCount: 0,
    selectionMode: false,
  },
};

export const BusyDeleting: Story = {
  args: {
    nodeCount: 5,
    edgeCount: 4,
    loading: true,
    disabled: true,
  },
};
