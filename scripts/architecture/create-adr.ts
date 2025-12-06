import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

const ADR_DIR = path.join(process.cwd(), 'docs', 'architecture', 'adr');
const TEMPLATE_PATH = path.join(ADR_DIR, 'adr-template.md');
const INDEX_PATH = path.join(process.cwd(), 'docs', 'architecture', 'ADR_INDEX.md');

type AdrMetadata = {
  id: string;
  title: string;
  status: string;
  date: string;
  link: string;
};

type TemplateContext = {
  number: string;
  title: string;
  status: string;
  deciders: string;
  contributors: string;
  tags: string;
  date: string;
};

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function getExistingAdrs(): Promise<AdrMetadata[]> {
  const matches = await glob(path.join(ADR_DIR, 'ADR-*.md'), {
    ignore: path.join(ADR_DIR, 'adr-template.md'),
  });

  const parsed = await Promise.all(
    matches.map(async (file) => {
      const raw = await fs.readFile(file, 'utf8');
      const idMatch = raw.match(/^#\s+(ADR-\d+):\s+(.+)$/m);
      const statusMatch = raw.match(/^-\s+Status:\s*(.+)$/m);
      const dateMatch = raw.match(/^-\s+Date:\s*(.+)$/m);

      const id = idMatch?.[1] ?? path.basename(file, '.md');
      const title = idMatch?.[2]?.trim() ?? 'Unknown title';
      const status = statusMatch?.[1]?.trim() ?? 'Unknown';
      const date = dateMatch?.[1]?.trim() ?? 'Unknown';
      const link = `./adr/${path.basename(file)}`;

      return { id, title, status, date, link } satisfies AdrMetadata;
    })
  );

  return parsed.sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]));
}

function renderTemplate(template: string, context: TemplateContext): string {
  return template
    .replace(/{{NUMBER}}/g, context.number)
    .replace(/{{TITLE}}/g, context.title)
    .replace(/{{STATUS}}/g, context.status)
    .replace(/{{DECIDERS}}/g, context.deciders)
    .replace(/{{CONTRIBUTORS}}/g, context.contributors)
    .replace(/{{TAGS}}/g, context.tags)
    .replace(/{{DATE}}/g, context.date);
}

async function nextAdrNumber(): Promise<string> {
  const existing = await getExistingAdrs();
  const last = existing[existing.length - 1];
  const next = last ? Number(last.id.split('-')[1]) + 1 : 1;
  return next.toString().padStart(3, '0');
}

async function updateIndex(adrs: AdrMetadata[]): Promise<void> {
  const header = '# Architecture Decision Records (ADR) Index\n\n';
  const helper =
    '> Use `scripts/architecture/create-adr.ts "Title" --status Accepted --deciders "Team"` to add new decisions. Entries are ordered by ADR number.\n\n';
  const tableHeader = '| ID | Title | Status | Date | Link |\n| --- | --- | --- | --- | --- |\n';
  const rows = adrs
    .map(
      (adr) =>
        `| ${adr.id} | ${adr.title} | ${adr.status} | ${adr.date} | [${path.basename(adr.link)}](${adr.link}) |`
    )
    .join('\n');

  await fs.writeFile(INDEX_PATH, `${header}${helper}${tableHeader}${rows}\n`, 'utf8');
}

async function createAdr(): Promise<void> {
  if (!(await pathExists(TEMPLATE_PATH))) {
    throw new Error(`ADR template not found at ${TEMPLATE_PATH}`);
  }

  const [, , ...args] = process.argv;
  if (!args.length) {
    throw new Error('Usage: ts-node scripts/architecture/create-adr.ts "Title" [--status Accepted] [--deciders "Team"]');
  }

  const title = args[0];
  const options = args.slice(1);
  const status = options.find((arg) => arg.startsWith('--status='))?.split('=')[1] ?? 'Proposed';
  const deciders = options.find((arg) => arg.startsWith('--deciders='))?.split('=')[1] ?? 'TBD';
  const contributors = options.find((arg) => arg.startsWith('--contributors='))?.split('=')[1] ?? 'TBD';
  const tags = options.find((arg) => arg.startsWith('--tags='))?.split('=')[1] ?? 'architecture';

  const number = await nextAdrNumber();
  const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
  const rendered = renderTemplate(template, {
    number,
    title,
    status,
    deciders,
    contributors,
    tags,
    date: new Date().toISOString().slice(0, 10),
  });

  const filename = `ADR-${number}-${slugify(title)}.md`;
  const targetPath = path.join(ADR_DIR, filename);
  await fs.writeFile(targetPath, rendered, 'utf8');

  const updatedAdrs = await getExistingAdrs();
  await updateIndex(updatedAdrs);

  // eslint-disable-next-line no-console
  console.log(`Created ${path.relative(process.cwd(), targetPath)} and updated ADR index.`);
}

createAdr().catch((error) => {
  console.error(error);
  process.exit(1);
});
