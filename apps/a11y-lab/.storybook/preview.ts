import type { Preview } from '@storybook/react';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f8fbff' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
    a11y: {
      config: {},
      options: {
        checks: { 'color-contrast': true },
        restoreScroll: true,
      },
    },
  },
};

export default preview;
