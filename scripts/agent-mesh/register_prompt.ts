import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_DIR = path.resolve(__dirname, '../../prompts/registry');
const PROMPTS_DIR = path.join(REGISTRY_DIR, 'prompts');
const INDEX_FILE = path.join(REGISTRY_DIR, 'prompts.json');

// args parsing
const args = process.argv.slice(2);
const agent = getArg('--agent');
const name = getArg('--name');
const version = getArg('--version');
const file = getArg('--file');

function getArg(flag: string): string | null {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return null;
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function main() {
  if (!agent || !name || !version || !file) {
    console.error('Usage: tsx register_prompt.ts --agent <agent> --name <name> --version <version> --file <path>');
    process.exit(1);
  }

  // 1. Read prompt content
  if (!fs.existsSync(file)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
  }
  const content = fs.readFileSync(file, 'utf-8');
  const hash = sha256(content);

  // 2. Determine target path
  const agentDir = path.join(PROMPTS_DIR, agent);
  const nameDir = path.join(agentDir, name);
  const targetPath = path.join(nameDir, `${version}.md`);

  if (!fs.existsSync(agentDir)) fs.mkdirSync(agentDir, { recursive: true });
  if (!fs.existsSync(nameDir)) fs.mkdirSync(nameDir, { recursive: true });

  // 3. Write file to registry
  fs.writeFileSync(targetPath, content);
  console.log(`Wrote prompt to ${targetPath}`);

  // 4. Update Index
  let index = { prompts: [] };
  if (fs.existsSync(INDEX_FILE)) {
    index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  }

  const existingEntryIndex = index.prompts.findIndex((p: any) => p.agent === agent && p.name === name && p.version === version);

  const entry = {
    agent,
    name,
    version,
    hash,
    content_path: path.relative(REGISTRY_DIR, targetPath),
    updated_at: new Date().toISOString()
  };

  if (existingEntryIndex !== -1) {
    console.log(`Updating existing entry for ${agent}/${name}:${version}`);
    index.prompts[existingEntryIndex] = entry;
  } else {
    console.log(`Adding new entry for ${agent}/${name}:${version}`);
    index.prompts.push(entry);
  }

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`Updated index at ${INDEX_FILE}`);
}

main();
