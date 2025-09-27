import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import StatsOverview from '../StatsOverview.tsx';

// Mock the generated GraphQL hook
jest.mock('../../../generated/graphql.js', () => ({
  useDB_ServerStatsQuery: jest.fn(() => ({
    data: {
      serverStats: {
        uptime: '2d 14h 32m',
        totalInvestigations: 128,
        totalEntities: 42137,
        totalRelationships: 89542,
      }
    },
    loading: false,
    error: null
  }))
}));

describe('StatsOverview', () => {
  it('renders server stats correctly', async () => {
    render(
      <MockedProvider mocks={[]}>
        <StatsOverview />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('42,137')).toBeInTheDocument();
      expect(screen.getByText('89,542')).toBeInTheDocument();
      expect(screen.getByText('128')).toBeInTheDocument();
      expect(screen.getByText('2d 14h 32m')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Entities')).toBeInTheDocument();
    expect(screen.getByText('Total Relationships')).toBeInTheDocument();
    expect(screen.getByText('Investigations')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
  });

  it('shows loading state', async () => {
    // Mock loading state
    jest.doMock('../../../generated/graphql.js', () => ({
      useDB_ServerStatsQuery: () => ({
        data: null,
        loading: true,
        error: null
      })
    }));

    const { useDB_ServerStatsQuery } = await import('../../../generated/graphql.js');
    
    render(
      <MockedProvider mocks={[]}>
        <StatsOverview />
      </MockedProvider>
    );

    expect(screen.getAllByTestId('skeleton')).toHaveLength(4);
  });
});