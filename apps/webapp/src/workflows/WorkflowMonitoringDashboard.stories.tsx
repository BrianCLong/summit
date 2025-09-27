import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import { WorkflowMonitoringDashboard } from './WorkflowMonitoringDashboard';
import { WorkflowApolloProvider } from './WorkflowApolloProvider';
import { createWorkflowSubscriptionMock } from './mocks';

const meta: Meta<typeof WorkflowMonitoringDashboard> = {
  title: 'Workflows/WorkflowMonitoringDashboard',
  component: WorkflowMonitoringDashboard,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <WorkflowApolloProvider mocks={createWorkflowSubscriptionMock({ repeat: false })}>
        <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
          <Story />
        </Box>
      </WorkflowApolloProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof WorkflowMonitoringDashboard>;

export const Default: Story = {};
