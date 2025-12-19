import type { Preview } from '@storybook/react'
import React from 'react'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { handlers } from '../src/mock/handlers'
import { DesignSystemProvider } from '../src/theme/DesignSystemProvider'
import '../src/index.css'

// Initialize MSW
initialize()

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    msw: {
      handlers,
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0a0e27',
        },
      ],
    },
  },
  loaders: [mswLoader],
  decorators: [
    Story => (
      <DesignSystemProvider enableTokens>
        <Story />
      </DesignSystemProvider>
    ),
  ],
  tags: ['autodocs'],
}

export default preview
