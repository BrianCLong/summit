/**
 * useGraphData Hook Tests
 * Tests for GraphQL data hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import React from 'react';
import {
  useGraphData,
  useEntityDetails,
  useEntitySearch,
  useEnrichment,
  GET_GRAPH_DATA,
  GET_ENTITY_DETAILS,
  SEARCH_ENTITIES,
  GET_ENRICHMENT,
} from '../useGraphData';

// Mock data
const mockGraphData = {
  graphData: {
    nodes: [
      {
        id: '1',
        label: 'Test Entity',
        type: 'PERSON',
        description: 'Test description',
        confidence: 0.9,
        properties: null,
        source: 'manual',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
    edges: [
      {
        id: 'e1',
        fromEntityId: '1',
        toEntityId: '2',
        type: 'RELATED',
        label: 'Related To',
        confidence: 0.8,
        properties: null,
        source: 'auto',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
    nodeCount: 1,
    edgeCount: 1,
  },
};

const mockEntityDetails = {
  getEntityDetails: {
    id: '1',
    label: 'Test Entity',
    type: 'PERSON',
    description: 'Test description',
    confidence: 0.9,
    properties: { key: 'value' },
    source: 'manual',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    attack_ttps: ['T1001'],
    capec_ttps: null,
    actor_links: null,
    triage_score: 0.75,
  },
};

const mockSearchResults = {
  searchEntities: [
    {
      id: '1',
      label: 'Search Result',
      type: 'PERSON',
      description: 'Found entity',
      confidence: 0.85,
    },
  ],
};

const mockEnrichment = {
  entityEnrichment: {
    entityId: '1',
    lastEnriched: '2024-01-01T00:00:00Z',
    externalSources: [
      {
        source: 'OSINT',
        data: { info: 'test' },
        confidence: 0.9,
        lastUpdated: '2024-01-01T00:00:00Z',
      },
    ],
    geolocation: {
      country: 'US',
      city: 'New York',
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 0.95,
    },
    reputation: {
      score: 0.8,
      category: 'trusted',
      sources: ['source1', 'source2'],
      lastChecked: '2024-01-01T00:00:00Z',
    },
    relatedEntities: [
      {
        id: '2',
        type: 'ORGANIZATION',
        label: 'Related Org',
        description: 'Related organization',
      },
    ],
  },
};

// Wrapper for hooks that require Apollo Provider
const createWrapper = (mocks: any[]) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MockedProvider, { mocks, addTypename: false }, children);
};

describe('useGraphData', () => {
  it('returns loading state initially', () => {
    const mocks = [
      {
        request: {
          query: GET_GRAPH_DATA,
          variables: { investigationId: 'test-id' },
        },
        result: { data: mockGraphData },
      },
    ];

    const { result } = renderHook(
      () => useGraphData({ investigationId: 'test-id' }),
      { wrapper: createWrapper(mocks) },
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
  });

  it('returns graph data after loading', async () => {
    const mocks = [
      {
        request: {
          query: GET_GRAPH_DATA,
          variables: { investigationId: 'test-id' },
        },
        result: { data: mockGraphData },
      },
    ];

    const { result } = renderHook(
      () => useGraphData({ investigationId: 'test-id' }),
      { wrapper: createWrapper(mocks) },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.edges).toHaveLength(1);
    expect(result.current.nodeCount).toBe(1);
    expect(result.current.edgeCount).toBe(1);
  });

  it('transforms nodes correctly', async () => {
    const mocks = [
      {
        request: {
          query: GET_GRAPH_DATA,
          variables: { investigationId: 'test-id' },
        },
        result: { data: mockGraphData },
      },
    ];

    const { result } = renderHook(
      () => useGraphData({ investigationId: 'test-id' }),
      { wrapper: createWrapper(mocks) },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const node = result.current.nodes[0];
    expect(node.id).toBe('1');
    expect(node.label).toBe('Test Entity');
    expect(node.type).toBe('PERSON');
  });

  it('generates Cytoscape elements', async () => {
    const mocks = [
      {
        request: {
          query: GET_GRAPH_DATA,
          variables: { investigationId: 'test-id' },
        },
        result: { data: mockGraphData },
      },
    ];

    const { result } = renderHook(
      () => useGraphData({ investigationId: 'test-id' }),
      { wrapper: createWrapper(mocks) },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cytoscapeElements).toHaveLength(2);
  });

  it('handles errors', async () => {
    const mocks = [
      {
        request: {
          query: GET_GRAPH_DATA,
          variables: { investigationId: 'test-id' },
        },
        error: new Error('Network error'),
      },
    ];

    const { result } = renderHook(
      () => useGraphData({ investigationId: 'test-id' }),
      { wrapper: createWrapper(mocks) },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe('Network error');
  });
});

describe('useEntityDetails', () => {
  it('returns null when entityId is null', () => {
    const { result } = renderHook(() => useEntityDetails(null), {
      wrapper: createWrapper([]),
    });

    expect(result.current.entity).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('fetches entity details', async () => {
    const mocks = [
      {
        request: {
          query: GET_ENTITY_DETAILS,
          variables: { entityId: '1' },
        },
        result: { data: mockEntityDetails },
      },
    ];

    const { result } = renderHook(() => useEntityDetails('1'), {
      wrapper: createWrapper(mocks),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entity?.id).toBe('1');
    expect(result.current.entity?.label).toBe('Test Entity');
  });
});

describe('useEntitySearch', () => {
  it('returns empty results initially', () => {
    const { result } = renderHook(() => useEntitySearch(), {
      wrapper: createWrapper([]),
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('provides search function', () => {
    const { result } = renderHook(() => useEntitySearch(), {
      wrapper: createWrapper([]),
    });

    expect(typeof result.current.search).toBe('function');
  });
});

describe('useEnrichment', () => {
  it('returns null when entityId is null', () => {
    const { result } = renderHook(() => useEnrichment(null), {
      wrapper: createWrapper([]),
    });

    expect(result.current.enrichment).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('fetches enrichment data', async () => {
    const mocks = [
      {
        request: {
          query: GET_ENRICHMENT,
          variables: { entityId: '1' },
        },
        result: { data: mockEnrichment },
      },
    ];

    const { result } = renderHook(() => useEnrichment('1'), {
      wrapper: createWrapper(mocks),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.enrichment?.entityId).toBe('1');
    expect(result.current.enrichment?.reputation.score).toBe(0.8);
    expect(result.current.enrichment?.geolocation?.country).toBe('US');
  });
});
