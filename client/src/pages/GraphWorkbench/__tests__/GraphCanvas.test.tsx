import React from 'react';
import { render } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import GraphCanvas from '../GraphCanvas';

jest.mock('cytoscape', () => () => ({
  destroy: jest.fn(),
  add: jest.fn(),
  layout: jest.fn(() => ({ run: jest.fn() })),
  elements: jest.fn(() => ({ unselect: jest.fn() })),
  nodes: jest.fn(() => ({ forEach: jest.fn() })),
  $: jest.fn(() => ({ find: jest.fn() })),
  $id: jest.fn(() => ({
    grabbed: jest.fn(() => false),
    ungrabify: jest.fn(),
    grabify: jest.fn(),
  })),
  fit: jest.fn(),
}));

// Mock the generated GraphQL hooks
jest.mock('../../../generated/graphql.js', () => ({
  useGwGraphDataQuery: () => ({
    data: {
      graphData: {
        nodes: [
          {
            id: '1',
            label: 'Test Node',
            type: 'Test',
            description: 'Test node',
          },
        ],
        edges: [
          {
            id: '1',
            fromEntityId: '1',
            toEntityId: '1',
            label: 'Test Edge',
            type: 'Test',
          },
        ],
      },
    },
    loading: false,
    error: null,
  }),
  useGwSearchEntitiesLazyQuery: () => [
    jest.fn(),
    { data: null, loading: false },
  ],
}));

test('mounts graph canvas and binds interactions', () => {
  render(
    <MockedProvider mocks={[]}>
      <GraphCanvas />
    </MockedProvider>,
  );
});
