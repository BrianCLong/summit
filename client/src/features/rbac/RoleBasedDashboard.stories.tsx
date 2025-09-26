import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MockedProvider } from '@apollo/client/testing';
import RoleBasedDashboard from './RoleBasedDashboard';
import ui from '../../store/slices/ui';
import rbac from '../../store/slices/rbacSlice';
import { GET_RBAC_CONTEXT } from '../../graphql/rbac.gql.js';

const baseUser = {
  id: 'user-1',
  displayName: 'Story User',
  role: 'analyst',
  primaryRole: 'analyst',
  roles: ['analyst'],
  personas: [],
  permissions: [],
  featureFlags: [],
};

function createStore() {
  return configureStore({
    reducer: {
      ui,
      rbac,
    },
  });
}

function withProviders(overrides: Partial<typeof baseUser>) {
  const store = createStore();
  const mocks = [
    {
      request: {
        query: GET_RBAC_CONTEXT,
      },
      result: {
        data: {
          me: { ...baseUser, ...overrides },
        },
      },
    },
  ];

  return (
    <Provider store={store}>
      <MockedProvider mocks={mocks}>
        <RoleBasedDashboard />
      </MockedProvider>
    </Provider>
  );
}

const meta: Meta<typeof RoleBasedDashboard> = {
  title: 'Features/RBAC/RoleBasedDashboard',
  component: RoleBasedDashboard,
};

export default meta;

type Story = StoryObj<typeof RoleBasedDashboard>;

export const Analyst: Story = {
  render: () => withProviders({}),
};

export const Admin: Story = {
  render: () =>
    withProviders({
      role: 'admin',
      primaryRole: 'admin',
      roles: ['admin'],
    }),
};

export const MaestroConductor: Story = {
  render: () =>
    withProviders({
      personas: ['maestro-conductor'],
      permissions: ['ml:manage'],
      featureFlags: [
        { key: 'ml-tools', enabled: true },
        { key: 'deployment-controls', enabled: false },
      ],
    }),
};
