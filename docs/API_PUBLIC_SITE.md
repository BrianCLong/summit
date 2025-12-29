# Public API Documentation Site

This guide describes how to produce and publish the public-facing API
documentation site for the IntelGraph platform.

## Goals

- Provide a single, versioned HTML reference for REST/GraphQL/SDK consumers.
- Keep the site in lockstep with the codebase via inline JSDoc/TS docblocks.
- Ship a static artifact that can be hosted from GitHub Pages, S3, or the
  `website/` bundle without runtime services.

## How to Generate the Site

```bash
npm install
npm run docs:api:public
```

The command uses `typedoc` with `typedoc.json` as the base config and outputs the
static site to `docs/public-api`. The entry point is `packages/sdk-js/src/index.ts`,
and the generated site inherits the repository README plus this guide as the
landing page context.

## Publishing Options

- **Static hosting**: Sync the `docs/public-api` directory to your static host
  (GitHub Pages, Netlify, S3 + CloudFront, etc.).
- **Docs bundle**: Copy `docs/public-api` into `website/static/api` and link it
  from the main documentation navigation.
- **CI artifact**: Add a pipeline step to run `npm run docs:api:public` and
  publish the directory as a build artifact for reviewers.

## Source of Truth and Change Management

- Inline JSDoc comments in the SDK and CLI are the canonical source for the
  reference pages. Any API surface change must update the relevant docblocks.
- ADR [0022](../adr/0022-public-api-docs-and-operational-docs.md) governs the
  requirement to keep the public API site current.
- When adding new packages to the API surface, extend `typedoc.json` entry
  points and ensure the output remains within `docs/public-api`.

## Quality Bar

- Broken links are treated as build failures in CI.
- All public APIs require parameter/return documentation and examples.
- Regenerate the site for every tagged release so that hosted docs match the
  distributed artifacts.
