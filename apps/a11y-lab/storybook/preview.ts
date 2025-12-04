import type { Preview } from '@storybook/react';
import { withA11y } from '@storybook/addon-a11y';
import { toggleA11yHeatmap } from '../src/heatmap-overlay';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    actions: { argTypesRegex: '^on[A-Z].*' },
    a11y: {
      disable: false,
      config: {},
      element: '#root',
      manual: false,
    },
    backgrounds: { disable: true },
  },
  decorators: [withA11y],
  globalTypes: {
    a11yHeatmap: {
      name: 'A11y Heatmap',
      description: 'Toggle runtime accessibility heatmap overlay',
      defaultValue: false,
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: false, title: 'Off' },
          { value: true, title: 'On' },
        ],
      },
    },
  },
};

export const decorators = [
  (Story, context) => {
    if (context.globals.a11yHeatmap) {
      toggleA11yHeatmap();
    }
    return Story();
  },
];

export default preview;
