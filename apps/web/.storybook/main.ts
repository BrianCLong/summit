import type { StorybookConfig } from '@storybook/react-vite'
import autoprefixer from 'autoprefixer'
import tailwindcss from '@tailwindcss/postcss'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-onboarding',
    '@storybook/addon-interactions',
    'msw-storybook-addon',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: prop =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
  viteFinal: async baseConfig => ({
    ...baseConfig,
    css: {
      ...baseConfig.css,
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
  }),
}

export default config
