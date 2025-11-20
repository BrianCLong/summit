const lightCodeTheme = require('./src/main/docusaurus-theme-live-code/lib/theme/prismLight');
const darkCodeTheme = require('./src/main/docusaurus-theme-live-code/lib/theme/prismDark');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Summit IntelGraph Documentation',
  tagline: 'The view from above the clouds — Sum it. See it. Decide.',
  url: 'https://intelgraph.github.io',
  baseUrl: '/intelgraph/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  organizationName: 'intelgraph', // Usually your GitHub org/user name.
  projectName: 'intelgraph', // Usually your repo name.

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/intelgraph/intelgraph/tree/main/docs-site/',
        },
        blog: {
          showReadingTime: true,
          editUrl:
            'https://github.com/intelgraph/intelgraph/tree/main/docs-site/',
        },
        theme: { customCss: require.resolve('./src/css/custom.css') },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Summit IntelGraph',
        logo: { alt: 'Summit IntelGraph Logo', src: 'img/logo.svg' },
        items: [
          { type: 'doc', docId: 'README', position: 'left', label: 'Docs' },
          { to: '/blog', label: 'Blog', position: 'left' },
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
            title: 'Docs',
            items: [
              { label: 'Get Started', to: '/README' },
              { label: 'Architecture', to: '/ARCHITECTURE' },
              { label: 'Maestro CLI', to: '/reference/maestro-cli' },
            ],
          },
          {
            title: 'Features',
            items: [
              { label: 'Provenance & Policy', to: '/concepts/provenance' },
              { label: 'AI Copilot', to: '/concepts/copilot' },
            ],
          },
          {
            title: 'More',
            items: [
              { label: 'GitHub', href: 'https://github.com/BrianCLong/summit' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Summit IntelGraph. Built with Docusaurus.`,
      },
      prism: { theme: lightCodeTheme, darkTheme: darkCodeTheme },
      algolia: {
        appId: 'APP_ID',
        apiKey: 'PUBLIC_SEARCH_KEY',
        indexName: 'intelgraph_docs',
        contextualSearch: true,
        searchParameters: {
          optionalWords: ['GraphRAG', 'graph rag', 'orchestration', 'workflow'],
        },
      },
    }),

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'default',
        path: '../docs',
        routeBasePath: '/', // docs at site root
        sidebarPath: './sidebars.js',
        editUrl: 'https://github.com/intelgraph/intelgraph/edit/main/docs/',
        showLastUpdateTime: true,
        showLastUpdateAuthor: true,
        includeCurrentVersion: true,
        lastVersion: 'current',
        versions: { current: { label: 'latest' } },
      },
    ],
    [
      'redocusaurus',
      {
        specs: [
          {
            id: 'maestro',
            spec: '../maestro-orchestration-api.yaml',
            route: '/intelgraph/api/maestro/1.0.0',
          },
          {
            id: 'core',
            spec: '../intelgraph-core-api.yaml',
            route: '/intelgraph/api/core/1.0.0',
          },
        ],
        theme: { primaryColor: '#0f766e' },
      },
    ],
    [
      '@docusaurus/plugin-client-redirects',
      { redirects: [{ from: '/api', to: '/intelgraph/api/core/1.0.0' }] },
    ],
  ],
};

module.exports = config;
