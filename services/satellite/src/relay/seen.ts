import fs from 'fs';
import path from 'path';

const PATH = process.env.SEEN_TICKETS_FILE || '/data/seen.json';
let set = new Set<string>();

try {
  set = new Set(JSON.parse(fs.readFileSync(PATH, 'utf8')));
} catch {}

export function wasSeen(id: string) {
  return set.has(id);
}

export function markSeen(id: string) {
  set.add(id);
  fs.mkdirSync(path.dirname(PATH), { recursive: true });
  fs.writeFileSync(PATH, JSON.stringify([...set]));
}
