import fs from 'fs';
import { createHash } from 'crypto';

export function sha256File(p: string): string {
  const data = fs.readFileSync(p);
  const h = createHash('sha256');
  h.update(data);
  return h.digest('hex');
}
