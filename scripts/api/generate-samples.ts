// scripts/api/generate-samples.ts – stub using openapi-snippet
import fs from 'node:fs';
import path from 'node:path';
import { default as oas } from 'openapi3-ts';
import httpsnippet from 'httpsnippet';

const specPath = path.resolve(__dirname, '../../api/intelgraph-core-api.yaml');
const spec = fs.readFileSync(specPath, 'utf8');
// Parse spec (use your preferred parser), then for a few key endpoints build samples:
// new HTTPSnippet(har).convert('shell', 'curl') etc. Write mdx fragments into docs/reference/api/samples/
