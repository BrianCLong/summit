const lightCodeTheme = require('./src/main/docusaurus-theme-live-code/lib/theme/prismLight');
const darkCodeTheme = require('./src/main/docusaurus-theme-live-code/lib/theme/prismDark');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Maestro & IntelGraph API Docs',
  tagline: 'Orchestrate Intelligence, Securely.',
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
        title: 'Maestro & IntelGraph',
        logo: { alt: 'Maestro & IntelGraph Logo', src: 'img/logo.svg' },
        items: [
          { type: 'doc', docId: 'intro', position: 'left', label: 'Docs' },
          { to: '/blog', label: 'Blog', position: 'left' },
          {
            href: 'https://github.com/intelgraph/intelgraph',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [],
        copyright: `Copyright © ${new Date().getFullYear()} IntelGraph. Built with Docusaurus.`,
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
            id: 'core',
            spec: 'static/api-specs/core-api.yaml',
            route: '/api/core',
          },
          {
            id: 'maestro',
            spec: 'static/api-specs/maestro-api.yaml',
            route: '/api/maestro',
          },
          {
            id: 'pipelines',
            spec: 'static/api-specs/pipelines-api.yaml',
            route: '/api/pipelines',
          },
          {
            id: 'executors',
            spec: 'static/api-specs/executors-api.yaml',
            route: '/api/executors',
          },
          {
            id: 'policy-pack',
            spec: 'static/api-specs/policy-pack-api.yaml',
            route: '/api/policy-pack',
          },
          {
            id: 'evidence',
            spec: 'static/api-specs/evidence-api.yaml',
            route: '/api/evidence',
          },
        ],
        theme: {
          primaryColor: '#0f766e',
          options: {
            hideDownloadButton: false,
            disableSearch: false,
            showObjectSchemaExamples: true,
          },
        },
      },
    ],
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          { from: '/api', to: '/api/core' },
          { from: '/intelgraph/api/core/1.0.0', to: '/api/core' },
          { from: '/intelgraph/api/maestro/1.0.0', to: '/api/maestro' },
        ],
      },
    ],
  ],
};

module.exports = config;
