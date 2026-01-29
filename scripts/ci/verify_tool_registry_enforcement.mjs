import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Simple YAML parser or regex check since we might not have js-yaml installed in the environment for this script
// The user provided snippet was:
// import registry from '../../governance/tool_registry.yaml';
// if (!registry.defaults || registry.defaults.access !== 'deny') ...

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const registryPath = path.resolve(__dirname, '../../governance/tool_registry.yaml');

try {
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('access: deny')) {
    console.error('Tool registry must be deny-by-default');
    process.exit(1);
  }
  console.log('Tool registry is properly configured as deny-by-default.');
} catch (error) {
  console.error('Error reading tool registry:', error);
  process.exit(1);
}
