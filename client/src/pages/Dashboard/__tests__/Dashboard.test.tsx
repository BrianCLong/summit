import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MockedProvider } from '@apollo/client/testing';
import { configureStore } from '@reduxjs/toolkit';
import ui from '../../../store/slices/ui';
import rbac from '../../../store/slices/rbacSlice';
import { GET_RBAC_CONTEXT } from '../../../graphql/rbac.gql.js';
import Dashboard from '../index';

const createStore = () =>
  configureStore({
    reducer: {
      ui,
      rbac,
    },
  });

const baseMock = {
  id: 'user-1',
  displayName: 'Test User',
  role: 'analyst',
  primaryRole: 'analyst',
  roles: ['analyst'],
  personas: [],
  permissions: [],
  featureFlags: [],
};

function renderDashboard(mockOverrides: Partial<typeof baseMock> = {}) {
  const store = createStore();
  const mock = {
    request: {
      query: GET_RBAC_CONTEXT,
    },
    result: {
      data: {
        me: { ...baseMock, ...mockOverrides },
      },
    },
  };

  render(
    <Provider store={store}>
      <MockedProvider mocks={[mock]}>
        <Dashboard />
      </MockedProvider>
    </Provider>,
  );
}

test('renders analyst dashboard by default', async () => {
  renderDashboard();
  expect(screen.getByRole('status')).toBeInTheDocument();
  await waitFor(() => screen.getByTestId('analyst-dashboard'));
});

test('renders admin controls when user has admin role', async () => {
  renderDashboard({ role: 'admin', primaryRole: 'admin', roles: ['analyst', 'admin'] });
  await waitFor(() => screen.getByTestId('admin-dashboard'));
  expect(screen.getByTestId('ml-tools-panel')).toBeInTheDocument();
});

test('renders maestro persona view and hides locked features', async () => {
  renderDashboard({
    role: 'analyst',
    primaryRole: 'analyst',
    personas: ['maestro-conductor'],
    permissions: ['ml:manage'],
    featureFlags: [{ key: 'ml-tools', enabled: true }],
  });

  await waitFor(() => screen.getByTestId('maestro-dashboard'));
  expect(screen.getByTestId('maestro-ml-tools')).toBeInTheDocument();
  expect(screen.getByTestId('maestro-deploy-locked')).toBeInTheDocument();
});
