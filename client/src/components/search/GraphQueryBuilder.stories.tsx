import type { Meta, StoryObj } from '@storybook/react';
import { MockedProvider } from '@apollo/client/testing';
import { GraphQueryBuilder, VALIDATE_GRAPH_QUERY } from './QueryChipBuilder';
import type { GraphQuery } from '@/types/graphQuery';

const sampleQuery: GraphQuery = {
  nodes: [
    {
      id: 'node-1',
      field: 'title',
      operator: 'contains',
      value: 'summit',
      type: 'condition',
    },
    {
      id: 'node-2',
      field: 'status',
      operator: 'equals',
      value: 'active',
      type: 'condition',
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      logicalOperator: 'AND',
    },
  ],
  rootId: 'node-1',
};

const mocks = [
  {
    request: {
      query: VALIDATE_GRAPH_QUERY,
      variables: { query: sampleQuery },
    },
    result: {
      data: {
        validateGraphQuery: {
          valid: true,
          message: 'Query looks good',
          errors: [],
          suggestions: [],
          normalized: JSON.stringify(sampleQuery),
        },
      },
    },
  },
];

const meta: Meta<typeof GraphQueryBuilder> = {
  title: 'Search/GraphQueryBuilder',
  component: GraphQueryBuilder,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <MockedProvider mocks={mocks} addTypename={false}>
        <div style={{ height: 560 }}>
          <Story />
        </div>
      </MockedProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof GraphQueryBuilder>;

export const Default: Story = {
  args: {
    initialQuery: sampleQuery,
  },
};

export const EmptyState: Story = {
  args: {},
};
