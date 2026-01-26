import fs from 'fs';
import { load } from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const registryPath = path.resolve(__dirname, '../../governance/tool_registry.yaml');

const fileContents = fs.readFileSync(registryPath, 'utf8');
const registry = load(fileContents);

if (!registry.defaults || registry.defaults.access !== 'deny') {
  throw new Error('Tool registry must be deny-by-default');
}
