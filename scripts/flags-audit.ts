import fs from 'fs';
import yaml from 'js-yaml';
const flags = yaml.load(
  fs.readFileSync('feature-flags/flags.yaml', 'utf8'),
) as any;
const today = new Date().toISOString().slice(0, 10);
const expired = Object.entries(flags.features || flags).filter(
  ([, v]: any) => v.expires && v.expires < today,
);
if (expired.length) {
  console.error('Expired flags:', expired.map(([k]) => k).join(','));
  process.exit(1);
}
console.log('No expired flags.');
