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
          editUrl: 'https://github.com/intelgraph/intelgraph/tree/main/docs-site/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/intelgraph/intelgraph/tree/main/docs-site/',
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
          { href: 'https://github.com/intelgraph/intelgraph', label: 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        links: [],
        copyright: `Copyright © ${new Date().getFullYear()} IntelGraph. Built with Docusaurus.`,
      },
      prism: { theme: lightCodeTheme, darkTheme: darkCodeTheme },
    }),

  plugins: [
    [
      'docusaurus-plugin-redoc',
      {
        specs: [
          {
            spec: '../maestro-orchestration-api.yaml',
            routePath: '/api/maestro/1.0.0',
          },
          {
            spec: '../intelgraph-core-api.yaml',
            routePath: '/api/core/1.0.0',
          },
        ],
        // Theme options for Redoc
        theme: {
          primaryColor: '#1890ff',
        },
      },
    ],
  ],
};

module.exports = config;
