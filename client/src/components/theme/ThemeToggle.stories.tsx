import React from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import ThemeToggle from './ThemeToggle';
import ThemeProvider from '../../theme/ThemeProvider';

type ThemeInitializerProps = {
  mode?: 'light' | 'dark';
};

const ThemeInitializer = ({ mode }: ThemeInitializerProps) => {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    if (mode) {
      window.localStorage.setItem('summit.theme', mode);
    } else {
      window.localStorage.removeItem('summit.theme');
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('summit.theme');
      }
    };
  }, [mode]);

  return null;
};

const withTheme = (mode?: 'light' | 'dark'): Decorator => (Story) => (
  <ThemeProvider>
    <ThemeInitializer mode={mode} />
    <div className="min-h-screen bg-background p-6 text-foreground transition-colors">
      <Story />
    </div>
  </ThemeProvider>
);

const meta: Meta<typeof ThemeToggle> = {
  title: 'Theme/ThemeToggle',
  component: ThemeToggle,
  decorators: [withTheme('light')],
};

export default meta;

type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {};

export const Dark: Story = {
  decorators: [withTheme('dark')],
};
