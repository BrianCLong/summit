import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const currentYear = new Date().getFullYear();

const config: Config = {
  title: 'Summit Platform',
  tagline: 'AI-Augmented Intelligence Analysis Platform',
  favicon: 'img/favicon.ico',

  // Production URL
  url: 'https://docs.summit.io',
  baseUrl: '/',

  // GitHub pages deployment config
  organizationName: 'BrianCLong',
  projectName: 'summit',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Internationalization
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/BrianCLong/summit/tree/main/website/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          versions: {
            current: {
              label: '1.0.0',
              path: 'current',
            },
          },
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/BrianCLong/summit/tree/main/website/',
          blogTitle: 'Summit Platform Blog',
          blogDescription: 'Technical updates and insights from the Summit team',
          postsPerPage: 10,
          feedOptions: {
            type: 'all',
            copyright: `Copyright © ${currentYear} Summit Platform`,
          },
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/summit-social-card.jpg',
    navbar: {
      title: 'Summit',
      logo: {
        alt: 'Summit Platform Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/docs/api/overview',
          label: 'API',
          position: 'left',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownActiveClassDisabled: true,
        },
        {
          href: 'https://github.com/BrianCLong/summit',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started/quickstart',
            },
            {
              label: 'API Reference',
              to: '/docs/api/overview',
            },
            {
              label: 'Guides',
              to: '/docs/guides/contributing',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/BrianCLong/summit/discussions',
            },
            {
              label: 'Issue Tracker',
              href: 'https://github.com/BrianCLong/summit/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/BrianCLong/summit',
            },
          ],
        },
      ],
      copyright: `Copyright © ${currentYear} Summit Platform. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'diff', 'json', 'graphql', 'python', 'docker', 'yaml'],
    },
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'summit',
      contextualSearch: true,
      searchParameters: {},
      searchPagePath: 'search',
    },
    announcementBar: {
      id: 'docs_launch',
      content:
        '⭐️ Welcome to the new Summit Documentation Hub! <a target="_blank" rel="noopener noreferrer" href="https://github.com/BrianCLong/summit">Give us a star on GitHub</a> ⭐️',
      backgroundColor: '#fafbfc',
      textColor: '#091E42',
      isCloseable: true,
    },
  } satisfies Preset.ThemeConfig,

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'api',
        path: 'docs/api',
        routeBasePath: 'api',
        sidebarPath: './sidebars.ts',
      },
    ],
  ],
};

export default config;
