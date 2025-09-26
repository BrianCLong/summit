import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import GraphStylePanel from './GraphStylePanel';

const meta: Meta<typeof GraphStylePanel> = {
  title: 'Features/Graph/GraphStylePanel',
  component: GraphStylePanel,
  args: {
    nodeTypeColors: {
      person: '#FF5733',
      organization: '#33FF57',
      location: '#3357FF',
      event: '#FF33FF',
      generic: '#888888',
    },
    nodeSize: 48,
    edgeColor: '#cccccc',
    edgeWidth: 2,
    onNodeColorChange: action('nodeColorChange'),
    onNodeSizeChange: action('nodeSizeChange'),
    onEdgeColorChange: action('edgeColorChange'),
    onEdgeWidthChange: action('edgeWidthChange'),
    onSave: action('save'),
    onReset: action('reset'),
    isSaving: false,
    isDirty: true,
    lastSavedAt: new Date().toISOString(),
    status: 'succeeded',
  },
};

export default meta;

type Story = StoryObj<typeof GraphStylePanel>;

export const Default: Story = {};

export const Saving: Story = {
  args: {
    isSaving: true,
    status: 'saving',
  },
};

export const UpToDate: Story = {
  args: {
    isDirty: false,
    status: 'succeeded',
  },
};
