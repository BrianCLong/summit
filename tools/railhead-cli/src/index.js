import { mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const templatesRoot = path.join(repoRoot, 'templates', 'golden-path');
const commonRoot = path.join(templatesRoot, 'common');
const lockPath = path.join(templatesRoot, 'lock.json');

function usage() {
  return `Railhead CLI\n\nCommands:\n  railhead list                         List available templates\n  railhead init <template> <dir>        Scaffold a new service repository\n    --service-name <name>               Human readable service name (required)\n    --description <text>                Optional description for README metadata\n    --registry <oci-url>                Container registry URI (default: ghcr.io/example)\n    --skip-common                       Skip copying shared common assets\n    --dry-run                           Print actions without writing files\n  railhead lock                         Print pinned toolchain metadata`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    return { command: 'help' };
  }
  const [command, ...rest] = args;
  if (command === 'list' || command === 'lock') {
    return { command };
  }
  if (command === 'init') {
    if (rest.length === 0) {
      throw new Error('init requires <template> and <dir> arguments.');
    }
    const [template, target, ...flags] = rest;
    const options = { command, template, targetDir: target, dryRun: false, skipCommon: false };
    for (let i = 0; i < flags.length; i++) {
      const value = flags[i];
      switch (value) {
        case '--service-name':
          options.serviceName = flags[++i];
          break;
        case '--description':
          options.description = flags[++i];
          break;
        case '--registry':
          options.registry = flags[++i];
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        case '--skip-common':
          options.skipCommon = true;
          break;
        default:
          throw new Error(`Unknown flag: ${value}`);
      }
    }
    if (!options.serviceName) {
      throw new Error('--service-name is required for init.');
    }
    return options;
  }
  return { command: 'help' };
}

async function loadTemplateConfig(templateName) {
  const configPath = path.join(templatesRoot, templateName, 'template-config.json');
  const data = await readFile(configPath, 'utf8');
  const parsed = JSON.parse(data);
  return parsed;
}

async function listTemplates() {
  const dirs = await readdir(templatesRoot, { withFileTypes: true });
  const templates = [];
  for (const entry of dirs) {
    if (!entry.isDirectory() || entry.name === 'common') continue;
    const configFile = path.join(templatesRoot, entry.name, 'template-config.json');
    try {
      const raw = await readFile(configFile, 'utf8');
      const config = JSON.parse(raw);
      templates.push({ id: entry.name, name: config.name, description: config.description });
    } catch (error) {
      templates.push({ id: entry.name, name: entry.name, description: 'Missing template-config.json' });
    }
  }
  if (templates.length === 0) {
    console.log('No templates registered.');
    return;
  }
  console.log('Available templates:\n');
  for (const template of templates) {
    console.log(`- ${template.id}: ${template.name}\n    ${template.description}\n`);
  }
}

function toSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function applyPlaceholders(text, context) {
  let result = text;
  for (const [key, value] of Object.entries(context)) {
    const token = new RegExp(`__${key}__`, 'g');
    result = result.replace(token, value);
    const mustache = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(mustache, value);
  }
  return result;
}

async function copyWithTemplate(sourceDir, targetDir, context, dryRun = false) {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  await mkdir(targetDir, { recursive: true });
  for (const entry of entries) {
    if (entry.name === 'template-config.json') continue;
    const sourcePath = path.join(sourceDir, entry.name);
    const targetName = applyPlaceholders(entry.name, context);
    const targetPath = path.join(targetDir, targetName);
    if (entry.isDirectory()) {
      if (dryRun) {
        console.log(`[dry-run] mkdir ${targetPath}`);
      }
      await copyWithTemplate(sourcePath, targetPath, context, dryRun);
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] write ${targetPath}`);
    } else {
      const content = await readFile(sourcePath, 'utf8');
      const rendered = applyPlaceholders(content, context);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, rendered, 'utf8');
    }
  }
}

async function ensureDirReady(dirPath) {
  try {
    const existing = await stat(dirPath);
    if (!existing.isDirectory()) {
      throw new Error(`${dirPath} exists and is not a directory.`);
    }
    const files = await readdir(dirPath);
    if (files.length > 0) {
      throw new Error(`${dirPath} is not empty. Choose an empty directory.`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await mkdir(dirPath, { recursive: true });
      return;
    }
    throw error;
  }
}

async function initTemplate(options) {
  const config = await loadTemplateConfig(options.template);
  const targetDir = path.resolve(process.cwd(), options.targetDir);
  const context = {
    SERVICE_NAME: options.serviceName,
    SERVICE_SLUG: toSlug(options.serviceName),
    SERVICE_DESCRIPTION: options.description ?? config.description ?? '',
    OCI_REGISTRY: options.registry ?? 'ghcr.io/example'
  };
  await ensureDirReady(targetDir);
  if (!options.skipCommon) {
    const commonExists = await stat(commonRoot).catch(() => undefined);
    if (commonExists?.isDirectory()) {
      if (options.dryRun) {
        console.log(`[dry-run] hydrate common assets into ${targetDir}`);
      } else {
        await copyWithTemplate(commonRoot, targetDir, context);
      }
    }
  }
  const templateDir = path.join(templatesRoot, options.template);
  await copyWithTemplate(templateDir, targetDir, context, options.dryRun);
  console.log(`Template '${options.template}' scaffolded at ${targetDir}`);
  console.log('Next steps:');
  console.log('  1. git init && git add .');
  console.log('  2. pre-commit install');
  console.log('  3. Review .github/workflows for registry/project specific tweaks.');
}

async function printLockfile() {
  try {
    const data = await readFile(lockPath, 'utf8');
    console.log(data);
  } catch (error) {
    console.error('Unable to read lock metadata:', error.message);
  }
}

export async function run(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.log();
    console.log(usage());
    process.exit(1);
    return;
  }
  switch (options.command) {
    case 'help':
      console.log(usage());
      break;
    case 'list':
      await listTemplates();
      break;
    case 'init':
      await initTemplate(options);
      break;
    case 'lock':
      await printLockfile();
      break;
    default:
      console.log(usage());
  }
}

if (import.meta.url === `file://${__filename}`) {
  run(process.argv);
}
