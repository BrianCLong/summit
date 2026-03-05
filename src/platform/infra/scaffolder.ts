import * as fs from 'fs';
import * as path from 'path';

export interface ComponentConfig {
  name: string;
  owner?: string;
  tags?: string[];
}

export function generateScaffold(targetDir: string, config: ComponentConfig) {
  if (!config.owner) {
    throw new Error('Missing required metadata: owner');
  }

  // Create target directory structure
  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(path.join(targetDir, '.github', 'workflows'), { recursive: true });

  // Generate service.yaml
  const serviceYaml = `
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${config.name}
  tags:
    ${config.tags ? config.tags.map(tag => `- ${tag}`).join('\n    ') : ''}
spec:
  type: service
  owner: ${config.owner}
  lifecycle: experimental
`;

  fs.writeFileSync(path.join(targetDir, 'service.yaml'), serviceYaml.trim());

  // Generate .github/workflows/ci-core.yml
  const ciCoreYml = `
name: CI Core Stub
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Build ${config.name}"
`;

  fs.writeFileSync(path.join(targetDir, '.github', 'workflows', 'ci-core.yml'), ciCoreYml.trim());
}
