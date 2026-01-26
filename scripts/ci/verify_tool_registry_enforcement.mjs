import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

try {
  const registryPath = path.resolve('governance/tool_registry.yaml');
  const fileContents = fs.readFileSync(registryPath, 'utf8');
  const registry = yaml.load(fileContents);

  if (!registry.defaults || registry.defaults.access !== 'deny') {
    throw new Error('Tool registry must be deny-by-default');
  }
  console.log('Verified: Tool registry is deny-by-default.');
} catch (error) {
  console.error('Verification failed:', error.message);
  process.exit(1);
}
