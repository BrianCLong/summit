import React from 'react';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Dashboard from '../components/dashboard/Dashboard';

describe('Dashboard', () => {
  it('renders title and buttons', async () => {
    const store = configureStore({ reducer: {} });

    render(
      <MockedProvider>
        <Provider store={store}>
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        </Provider>
      </MockedProvider>,
    );

    expect(
      screen.getByText('Dashboard', { selector: 'h1' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('New Investigation')).toBeInTheDocument();
    expect(await screen.findByText('Send Demo Alert')).toBeInTheDocument();
  });
});
