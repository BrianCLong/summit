import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const BUILT_IN_TEMPLATES: Record<string, unknown> = {
  'build-basic': {
    name: 'build-basic',
    stages: [
      { name: 'install', steps: [{ run: 'shell', with: { command: 'npm ci' } }] },
      { name: 'test', steps: [{ run: 'shell', with: { command: 'npm test' } }] },
    ],
  },
  'scrape-site': {
    name: 'scrape-site',
    stages: [
      {
        name: 'scrape',
        steps: [
          {
            run: 'web_scraper',
            with: { url: 'https://example.com', extract: { type: 'html' } },
          },
        ],
      },
    ],
  },
};

export class TemplateCommand {
  async list(options: { remote?: boolean }): Promise<void> {
    if (options.remote) {
      // eslint-disable-next-line no-console
      console.log('Remote template registry is not configured.');
      return;
    }
    // eslint-disable-next-line no-console
    console.table(
      Object.keys(BUILT_IN_TEMPLATES).map((name) => ({ name })),
      ['name'],
    );
  }

  async show(name: string): Promise<void> {
    const template = BUILT_IN_TEMPLATES[name];
    if (!template) {
      // eslint-disable-next-line no-console
      console.error(`Template ${name} not found`);
      return;
    }
    // eslint-disable-next-line no-console
    console.log(yaml.dump(template, { indent: 2 }));
  }

  async create(
    name: string,
    options: { description?: string },
  ): Promise<void> {
    const source = path.resolve(process.cwd(), 'maestro.yaml');
    const targetDir = path.resolve(process.cwd(), 'templates');
    await fs.mkdir(targetDir, { recursive: true });
    const target = path.join(targetDir, `${name}.yaml`);

    const workflow = await fs.readFile(source, 'utf8');
    const parsed = yaml.load(workflow) as Record<string, unknown>;
    const enriched = {
      ...parsed,
      description: options.description || parsed?.description,
    };

    await fs.writeFile(target, yaml.dump(enriched, { indent: 2 }), 'utf8');
    // eslint-disable-next-line no-console
    console.log(`Template saved to ${target}`);
  }
}
