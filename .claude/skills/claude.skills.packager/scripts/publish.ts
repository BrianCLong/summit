import fs from 'fs';
import path from 'path';

export function publish(registryPath = '.claude/registry.yaml') {
  if (!fs.existsSync(registryPath)) throw new Error('registry not found');
  console.log('Publishing skills defined in', registryPath);
  // TODO: sign and upload to org registry
}

if (require.main === module) publish();
