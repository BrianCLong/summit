# Summit Documentation Hub

Comprehensive developer documentation for Summit Platform built with Docusaurus.

## Overview

This directory contains the complete documentation website for Summit Platform, including:

- **Getting Started Guides**: Quick start, installation, configuration
- **API Reference**: GraphQL, REST, and WebSocket documentation
- **Architecture Docs**: System design, data flow, security
- **Developer Guides**: Contributing, testing, debugging, performance
- **Code Examples**: Python, JavaScript, cURL, Postman collections
- **Tutorials**: Step-by-step guides for common tasks

## Development

### Prerequisites

- Node.js ≥ 18.18
- pnpm ≥ 9.12.0

### Installation

```bash
cd website
pnpm install
```

### Local Development

```bash
# Start development server
pnpm start

# This opens http://localhost:3000 with hot reloading
```

### Build

```bash
# Build static site
pnpm build

# Serve built site locally
pnpm serve
```

## Project Structure

```
website/
├── docs/                   # Documentation content
│   ├── getting-started/    # Getting started guides
│   ├── api/               # API documentation
│   ├── architecture/      # Architecture docs
│   ├── guides/            # Developer guides
│   ├── examples/          # Code examples
│   └── deployment/        # Deployment guides
├── blog/                  # Blog posts
├── src/                   # React components
│   ├── components/        # Custom components
│   ├── css/              # Custom styles
│   └── pages/            # Custom pages
├── static/               # Static assets
│   ├── img/              # Images
│   └── diagrams/         # Architecture diagrams
├── docusaurus.config.ts  # Docusaurus configuration
├── sidebars.ts           # Sidebar configuration
└── package.json          # Dependencies
```

## Writing Documentation

### Creating a New Doc

1. Create a new `.md` or `.mdx` file in the appropriate directory
2. Add frontmatter:

```markdown
---
sidebar_position: 1
title: My Document
description: Document description
---

# My Document

Content here...
```

3. Add to `sidebars.ts` if needed

### Using MDX

Docusaurus supports MDX, allowing you to use React components in markdown:

```mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="js" label="JavaScript">
    ```js
    console.log('Hello');
    ```
  </TabItem>
  <TabItem value="py" label="Python">
    ```python
    print('Hello')
    ```
  </TabItem>
</Tabs>
```

### Code Blocks

Use syntax highlighting:

````markdown
```javascript title="example.js"
const summit = new SummitClient();
```
````

### Admonitions

```markdown
:::note
This is a note
:::

:::tip
This is a tip
:::

:::warning
This is a warning
:::

:::danger
This is dangerous
:::
```

## Deployment

### Automatic Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to `main` branch.

See `.github/workflows/docs-deploy.yml` for CI/CD configuration.

### Manual Deployment

```bash
# Build
pnpm build

# Deploy (if you have gh-pages configured)
GIT_USER=<Your GitHub username> pnpm deploy
```

## Search

The documentation uses Algolia DocSearch for search functionality.

To configure:

1. Apply for Algolia DocSearch at https://docsearch.algolia.com/
2. Update `docusaurus.config.ts` with your credentials:

```typescript
algolia: {
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_API_KEY',
  indexName: 'summit',
}
```

## Versioning

To create a new documentation version:

```bash
pnpm docusaurus docs:version 1.0.0
```

This creates:
- `versioned_docs/version-1.0.0/` - Snapshot of docs
- `versioned_sidebars/version-1.0.0-sidebars.json` - Sidebar config

## Contributing

1. Make changes to documentation files
2. Test locally with `pnpm start`
3. Build to check for errors: `pnpm build`
4. Submit a pull request

## Best Practices

### Writing Style

- Use clear, concise language
- Write in second person ("you" instead of "we")
- Use active voice
- Include code examples
- Add screenshots when helpful

### Code Examples

- Test all code examples
- Include language identifiers for syntax highlighting
- Add comments to explain complex code
- Show both successful and error cases

### Links

- Use relative links for internal docs
- Check for broken links before committing
- Use descriptive link text (not "click here")

## Troubleshooting

### Build Errors

```bash
# Clear cache
pnpm docusaurus clear

# Rebuild
pnpm build
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill

# Or use a different port
pnpm start -- --port 3001
```

## Resources

- [Docusaurus Documentation](https://docusaurus.io/)
- [MDX Documentation](https://mdxjs.com/)
- [Markdown Guide](https://www.markdownguide.org/)

## Support

- 🐛 [Report documentation issues](https://github.com/BrianCLong/summit/issues)
- 💬 [Ask questions](https://github.com/BrianCLong/summit/discussions)
- 📧 Email: docs@summit.com
