import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import InteractiveGraphExplorer from './InteractiveGraphExplorer';
import ThemeProvider from '../../theme/ThemeProvider';

const meta: Meta<typeof InteractiveGraphExplorer> = {
  title: 'Graph/InteractiveGraphExplorer',
  component: InteractiveGraphExplorer,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div className="min-h-screen bg-background p-6 text-foreground transition-colors">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof InteractiveGraphExplorer>;

export const Default: Story = {};
