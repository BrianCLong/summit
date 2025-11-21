import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/quickstart',
        'getting-started/installation',
        'getting-started/configuration',
        'getting-started/first-import',
      ],
    },
    {
      type: 'category',
      label: 'API Documentation',
      items: [
        'api/overview',
        'api/authentication',
        {
          type: 'category',
          label: 'GraphQL API',
          items: [
            'api/graphql/overview',
            'api/graphql/queries',
            'api/graphql/mutations',
            'api/graphql/subscriptions',
          ],
        },
        {
          type: 'category',
          label: 'REST API',
          items: [
            'api/rest/overview',
            'api/rest/endpoints',
            'api/rest/health',
            'api/rest/admin',
          ],
        },
        'api/websocket',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/system-design',
        'architecture/data-flow',
        'architecture/database-schema',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: 'Developer Guides',
      items: [
        'guides/contributing',
        'guides/code-style',
        'guides/testing',
        'guides/debugging',
        'guides/performance',
      ],
    },
    {
      type: 'category',
      label: 'Integration Examples',
      items: [
        'examples/overview',
        'examples/python',
        'examples/javascript',
        'examples/curl',
        'examples/postman',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/overview',
        'deployment/docker',
        'deployment/kubernetes',
        'deployment/production',
      ],
    },
  ],
};

export default sidebars;
