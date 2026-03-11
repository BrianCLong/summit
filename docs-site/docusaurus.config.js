// const lightCodeTheme = require('./src/main/docusaurus-theme-live-code/lib/theme/prismLight');
// const darkCodeTheme = require('./src/main/docusaurus-theme-live-code/lib/theme/prismDark');
// const prism = require('prism-react-renderer');
// const lightCodeTheme = prism.themes.github;
// const darkCodeTheme = prism.themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Summit // Sovereign Intelligence OS',
  tagline: 'The Definitive Documentation for Strategic Force.',
  url: 'https://docs.summit.ai',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  organizationName: 'summit-intel', 
  projectName: 'summit-docs', 

  themes: ['@docusaurus/theme-mermaid'],
  markdown: {
    mermaid: true,
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          editUrl:
            'https://github.com/BrianCLong/summit/tree/main/docs/',
        },
        blog: false,
        theme: { customCss: require.resolve('./src/css/custom.css') },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'SUMMIT // INTEL',
        logo: { alt: 'Summit Logo', src: 'img/logo.svg' },
        items: [
          { type: 'doc', docId: 'intro', position: 'left', label: 'Protocol' },
          { to: '/runbooks', label: 'Runbooks', position: 'left' },
          {
             href: '/api',
             label: 'API Reference',
             position: 'left',
          },
          {
            href: 'https://github.com/BrianCLong/summit',
            label: 'Source',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `OPERATIONAL_STATUS: NOMINAL // © ${new Date().getFullYear()} SUMMIT INTELLIGENCE SYSTEMS`,
      },
      // prism: { theme: lightCodeTheme, darkTheme: darkCodeTheme },
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
