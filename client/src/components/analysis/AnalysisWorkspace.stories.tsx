import React from 'react';
import { Story, Meta } from '@storybook/react';
import AnalysisWorkspace, { AnalysisWorkspaceProps, WorkspaceLayout } from './AnalysisWorkspace';

export default {
  title: 'Analysis/AnalysisWorkspace',
  component: AnalysisWorkspace,
  argTypes: {
    userId: { control: 'text' },
    userName: { control: 'text' },
    userEmail: { control: 'text' },
  },
} as Meta;

const Template: Story<AnalysisWorkspaceProps> = (args) => <AnalysisWorkspace {...args} />;

const mockWorkspace: WorkspaceLayout = {
  id: 'workspace-1',
  name: 'Threat Analysis Workspace',
  description: 'Analysis of recent threat patterns',
  components: [
    {
      id: 'comp-1',
      type: 'graph',
      title: 'Threat Graph',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 30 },
      props: { data: 'threat-data' },
      linked: false,
      linkedTo: [],
    },
    {
      id: 'comp-2',
      type: 'timeline',
      title: 'Incident Timeline',
      position: { x: 45, y: 0 },
      size: { width: 30, height: 30 },
      props: { data: 'timeline-data' },
      linked: false,
      linkedTo: [],
    },
    {
      id: 'comp-3',
      type: 'table',
      title: 'IOC Table',
      position: { x: 0, y: 35 },
      size: { width: 75, height: 30 },
      props: { data: 'ioc-data' },
      linked: false,
      linkedTo: [],
    },
  ],
  createdAt: new Date(Date.now() - 86400000),
  updatedAt: new Date(),
  userId: 'user-1',
  sharedWith: ['user-2', 'user-3'],
  isPublic: false,
  tags: ['threat', 'analysis', 'ioc'],
};

export const Default = Template.bind({});
Default.args = {
  userId: 'user-1',
  userName: 'John Doe',
  userEmail: 'john.doe@intelgraph.com',
};

export const WithInitialWorkspace = Template.bind({});
WithInitialWorkspace.args = {
  userId: 'user-1',
  userName: 'John Doe',
  userEmail: 'john.doe@intelgraph.com',
  initialWorkspace: mockWorkspace,
};

export const EmptyWorkspace = Template.bind({});
EmptyWorkspace.args = {
  userId: 'user-2',
  userName: 'Jane Smith',
  userEmail: 'jane.smith@intelgraph.com',
};