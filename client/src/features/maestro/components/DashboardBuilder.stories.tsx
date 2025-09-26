import type { Meta, StoryObj } from '@storybook/react';
import { MockedProvider } from '@apollo/client/testing';
import { Provider } from 'react-redux';
import store from '../../../store/index';
import DashboardBuilder from './DashboardBuilder';
import {
  DASHBOARD_CONFIGURATION_QUERY,
  SAVE_DASHBOARD_CONFIGURATION_MUTATION,
} from '../graphql/dashboardOperations';

const mocks = [
  {
    request: {
      query: DASHBOARD_CONFIGURATION_QUERY,
      variables: {},
    },
    result: {
      data: {
        dashboardConfiguration: null,
      },
    },
  },
  {
    request: {
      query: SAVE_DASHBOARD_CONFIGURATION_MUTATION,
      variables: {
        input: {
          id: null,
          name: 'Command Center Dashboard',
          layout: 'grid',
          widgets: [],
          settings: { version: 1 },
        },
      },
    },
    result: {
      data: {
        saveDashboardConfiguration: {
          id: 'story-dashboard',
          name: 'Command Center Dashboard',
          description: null,
          layout: 'grid',
          settings: { version: 1 },
          updatedAt: new Date().toISOString(),
          widgets: [],
        },
      },
    },
  },
];

const meta: Meta<typeof DashboardBuilder> = {
  title: 'Features/Maestro/DashboardBuilder',
  component: DashboardBuilder,
  decorators: [
    (Story) => (
      <MockedProvider mocks={mocks} addTypename={false}>
        <Provider store={store}>
          <div style={{ padding: 24, background: '#020617', minHeight: '100vh' }}>
            <Story />
          </div>
        </Provider>
      </MockedProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof DashboardBuilder>;

export const Default: Story = {};
