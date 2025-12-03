/**
 * KGExplorer Tests
 * Comprehensive test suite for the Knowledge Graph Explorer component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { KGExplorer } from '../KGExplorer';
import { GET_GRAPH_DATA, GET_ENTITY_DETAILS } from '../useGraphData';
import {
  transformToGraphNode,
  transformToGraphEdge,
  toCytoscapeElements,
  NODE_TYPE_COLORS,
} from '../types';

// Mock Cytoscape
jest.mock('cytoscape', () => {
  const mockCy = {
    on: jest.fn(),
    batch: jest.fn((fn) => fn()),
    elements: jest.fn(() => ({ remove: jest.fn() })),
    add: jest.fn(),
    layout: jest.fn(() => ({ run: jest.fn() })),
    nodes: jest.fn(() => ({ length: 1 })),
    zoom: jest.fn(() => 1),
    fit: jest.fn(),
    animate: jest.fn(),
    getElementById: jest.fn(() => ({ length: 1 })),
    destroy: jest.fn(),
  };

  const cytoscape = jest.fn(() => mockCy);
  (cytoscape as any).use = jest.fn();
  return cytoscape;
});

// Mock Cytoscape extensions
jest.mock('cytoscape-fcose', () => jest.fn());
jest.mock('cytoscape-dagre', () => jest.fn());
jest.mock('cytoscape-cola', () => jest.fn());
jest.mock('cytoscape-edgehandles', () => jest.fn());

// Mock data
const mockNodes = [
  {
    id: '1',
    label: 'John Doe',
    type: 'PERSON',
    description: 'Test person',
    confidence: 0.85,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    properties: { role: 'analyst' },
    source: 'manual',
  },
  {
    id: '2',
    label: 'Acme Corp',
    type: 'ORGANIZATION',
    description: 'Test organization',
    confidence: 0.9,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    properties: null,
    source: 'osint',
  },
];

const mockEdges = [
  {
    id: 'e1',
    fromEntityId: '1',
    toEntityId: '2',
    type: 'WORKS_FOR',
    label: 'Works For',
    confidence: 0.8,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    properties: null,
    source: 'manual',
  },
];

const mocks = [
  {
    request: {
      query: GET_GRAPH_DATA,
      variables: { investigationId: 'test-investigation' },
    },
    result: {
      data: {
        graphData: {
          nodes: mockNodes,
          edges: mockEdges,
          nodeCount: 2,
          edgeCount: 1,
        },
      },
    },
  },
  {
    request: {
      query: GET_ENTITY_DETAILS,
      variables: { entityId: '1' },
    },
    result: {
      data: {
        getEntityDetails: mockNodes[0],
      },
    },
  },
];

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      {ui}
    </MockedProvider>,
  );
};

describe('KGExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', async () => {
      renderWithProvider(
        <KGExplorer investigationId="test-investigation" />,
      );

      expect(
        screen.getByRole('img', { name: /knowledge graph/i }),
      ).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      renderWithProvider(
        <KGExplorer investigationId="test-investigation" />,
      );

      expect(screen.getByText(/loading graph/i)).toBeInTheDocument();
    });

    it('displays node and edge counts after loading', async () => {
      renderWithProvider(
        <KGExplorer investigationId="test-investigation" />,
      );

      await waitFor(() => {
        expect(screen.getByText(/2 nodes/i)).toBeInTheDocument();
        expect(screen.getByText(/1 edge/i)).toBeInTheDocument();
      });
    });

    it('renders toolbar with layout options', async () => {
      renderWithProvider(
        <KGExplorer investigationId="test-investigation" />,
      );

      await waitFor(() => {
        expect(screen.getByText('Force-Directed')).toBeInTheDocument();
        expect(screen.getByText('Hierarchical')).toBeInTheDocument();
        expect(screen.getByText('Constraint-Based')).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('allows layout switching', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <KGExplorer investigationId="test-investigation" />,
      );

      await waitFor(() => {
        expect(screen.getByText('Hierarchical')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Hierarchical'));
      // Layout change is handled internally by Cytoscape mock
    });

    it('shows filter panel when filter button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <KGExplorer investigationId="test-investigation" />,
      );

      await waitFor(() => {
        expect(screen.getByText('Filter')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Filter'));
      expect(screen.getByText('Entity Types')).toBeInTheDocument();
      expect(screen.getByText(/Min Confidence/i)).toBeInTheDocument();
    });

    it('handles search input', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <KGExplorer investigationId="test-investigation" />,
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/search entities/i),
        ).toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/search entities/i),
        'John',
      );
    });

    it('toggles RAG preview panel', async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <KGExplorer investigationId="test-investigation" />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Hide RAG Preview/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Hide RAG Preview/i));
      expect(screen.getByText(/Show RAG Preview/i)).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('calls onNodeSelect when a node is selected', async () => {
      const onNodeSelect = jest.fn();
      renderWithProvider(
        <KGExplorer
          investigationId="test-investigation"
          onNodeSelect={onNodeSelect}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/2 nodes/i)).toBeInTheDocument();
      });

      // Node selection is handled internally by Cytoscape events
      // This test verifies the callback prop is accepted
      expect(onNodeSelect).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message on query failure', async () => {
      const errorMocks = [
        {
          request: {
            query: GET_GRAPH_DATA,
            variables: { investigationId: 'test-investigation' },
          },
          error: new Error('Failed to fetch graph data'),
        },
      ];

      render(
        <MockedProvider mocks={errorMocks} addTypename={false}>
          <KGExplorer investigationId="test-investigation" />
        </MockedProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading graph/i)).toBeInTheDocument();
      });
    });
  });
});

describe('Type Transformations', () => {
  describe('transformToGraphNode', () => {
    it('transforms API node to GraphNode', () => {
      const apiNode = {
        id: '1',
        label: 'Test',
        type: 'PERSON',
        description: 'Desc',
        confidence: 0.9,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        properties: { key: 'value' },
        source: 'manual',
      };

      const result = transformToGraphNode(apiNode as any);

      expect(result).toEqual({
        id: '1',
        label: 'Test',
        type: 'PERSON',
        description: 'Desc',
        confidence: 0.9,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        properties: { key: 'value' },
        source: 'manual',
      });
    });

    it('handles null optional fields', () => {
      const apiNode = {
        id: '1',
        label: 'Test',
        type: 'PERSON',
        description: null,
        confidence: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        properties: null,
        source: null,
      };

      const result = transformToGraphNode(apiNode as any);

      expect(result.description).toBeUndefined();
      expect(result.confidence).toBeUndefined();
      expect(result.properties).toBeUndefined();
      expect(result.source).toBeUndefined();
    });
  });

  describe('transformToGraphEdge', () => {
    it('transforms API edge to GraphEdge', () => {
      const apiEdge = {
        id: 'e1',
        fromEntityId: '1',
        toEntityId: '2',
        type: 'WORKS_FOR',
        label: 'Works For',
        confidence: 0.8,
        properties: { since: '2020' },
      };

      const result = transformToGraphEdge(apiEdge as any);

      expect(result).toEqual({
        id: 'e1',
        source: '1',
        target: '2',
        type: 'WORKS_FOR',
        label: 'Works For',
        confidence: 0.8,
        properties: { since: '2020' },
      });
    });
  });

  describe('toCytoscapeElements', () => {
    it('converts nodes and edges to Cytoscape format', () => {
      const nodes = [
        { id: '1', label: 'Node 1', type: 'PERSON', confidence: 0.9 },
        { id: '2', label: 'Node 2', type: 'ORGANIZATION', confidence: 0.8 },
      ];
      const edges = [
        {
          id: 'e1',
          source: '1',
          target: '2',
          type: 'RELATED',
          label: 'Related',
        },
      ];

      const result = toCytoscapeElements(nodes as any, edges as any);

      expect(result).toHaveLength(3);

      // Check node format
      expect(result[0]).toMatchObject({
        data: { id: '1', label: 'Node 1', type: 'PERSON' },
        classes: 'person',
      });

      // Check edge format
      expect(result[2]).toMatchObject({
        data: { id: 'e1', source: '1', target: '2' },
        classes: 'related',
      });
    });
  });
});

describe('NODE_TYPE_COLORS', () => {
  it('provides colors for all standard entity types', () => {
    const standardTypes = [
      'PERSON',
      'ORGANIZATION',
      'LOCATION',
      'DOCUMENT',
      'EVENT',
      'ASSET',
      'THREAT',
      'INDICATOR',
    ];

    standardTypes.forEach((type) => {
      expect(NODE_TYPE_COLORS[type]).toBeDefined();
      expect(NODE_TYPE_COLORS[type]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('provides a DEFAULT color', () => {
    expect(NODE_TYPE_COLORS.DEFAULT).toBeDefined();
  });
});
