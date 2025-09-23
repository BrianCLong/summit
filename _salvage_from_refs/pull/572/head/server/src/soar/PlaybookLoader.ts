import fs from 'fs';
import yaml from 'js-yaml';

export interface Playbook {
  metadata: { name: string; version: string };
  spec: { steps: any[] };
}

export function loadPlaybook(p: string): Playbook {
  const doc = yaml.load(fs.readFileSync(p, 'utf8')) as any;
  if (!doc.metadata || !doc.spec) throw new Error('invalid_playbook');
  return doc as Playbook;
}
