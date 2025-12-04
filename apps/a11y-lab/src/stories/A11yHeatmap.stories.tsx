import type { Meta, StoryObj } from '@storybook/react';
import App from '../App';
import { A11yHeatmapOverlay } from '../components/A11yHeatmapOverlay';

const meta: Meta<typeof App> = {
  title: 'A11y Lab/App Shell',
  component: App,
  parameters: {
    a11y: {
      disable: false,
    },
  },
};

export default meta;

export const Default: StoryObj<typeof App> = {
  name: 'A11y Lab (heatmap on)',
  render: () => <App />,
};

export const HeatmapOnly: StoryObj<typeof A11yHeatmapOverlay> = {
  name: 'Heatmap overlay',
  render: () => <A11yHeatmapOverlay enabled />,
};
