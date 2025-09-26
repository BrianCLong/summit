import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import InteractiveTutorialMenu from './InteractiveTutorialMenu';

const meta: Meta<typeof InteractiveTutorialMenu> = {
  title: 'Tutorials/InteractiveTutorialMenu',
  component: InteractiveTutorialMenu,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof InteractiveTutorialMenu>;

export const Default: Story = {
  args: {
    tutorials: [
      {
        id: 'ingest-wizard',
        title: 'Data Ingest Wizard Tour',
        description:
          'Configure sources, preview entity mappings, and start AI analysis with a guided five-step ingest flow.',
        featureArea: 'Data Onboarding',
        estimatedTime: '3 minutes',
        completed: false,
        completedAt: null,
      },
      {
        id: 'graph-query',
        title: 'Graph Querying Tour',
        description:
          'Ask natural language questions, reuse query history, and interpret graph insights with confidence.',
        featureArea: 'Graph Analysis',
        estimatedTime: '2 minutes',
        completed: true,
        completedAt: new Date().toISOString(),
      },
    ],
    onStart: action('start-tutorial'),
    onRestart: action('restart-tutorial'),
    isLoading: false,
  },
};
