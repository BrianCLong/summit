import React from 'react';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';

describe('Dashboard', () => {
  it('renders title and buttons', async () => {
    render(
      <MockedProvider>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </MockedProvider>
    );

    expect(await screen.findByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Investigation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Demo Alert/i })).toBeInTheDocument();
  });
});

