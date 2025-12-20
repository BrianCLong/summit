import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface InitOptions {
  template?: string;
  directory?: string;
  interactive?: boolean;
}

const TEMPLATE_REGISTRY: Record<string, unknown> = {
  default: {
    name: 'maestro-workflow',
    version: '1.0.0',
    stages: [
      {
        name: 'setup',
        steps: [{ run: 'shell', with: { command: 'npm install' } }],
      },
      {
        name: 'test',
        steps: [{ run: 'shell', with: { command: 'npm test' } }],
      },
      {
        name: 'build',
        steps: [{ run: 'shell', with: { command: 'npm run build' } }],
      },
    ],
  },
};

export class InitCommand {
  async execute(options: InitOptions): Promise<void> {
    const targetDir = options.directory
      ? path.resolve(process.cwd(), options.directory)
      : process.cwd();
    await fs.mkdir(targetDir, { recursive: true });

    const templateName = options.template || 'default';
    const template =
      TEMPLATE_REGISTRY[templateName] || TEMPLATE_REGISTRY.default;

    const filePath = path.join(targetDir, 'maestro.yaml');
    const contents = yaml.dump(template, { indent: 2 });
    await fs.writeFile(filePath, contents, 'utf8');

    // eslint-disable-next-line no-console
    console.log(`✓ Created workflow at ${filePath}`);
  }
}
