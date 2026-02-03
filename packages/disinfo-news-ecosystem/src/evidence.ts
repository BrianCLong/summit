import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export function evidenceIdFromBytes(bytes: Buffer): string {
  const h = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  return `EVD_${h}`;
}

export function writeDeterministicJson(filePath: string, obj: unknown) {
  const json = JSON.stringify(obj, (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
          return Object.keys(value).sort().reduce((sorted, k) => {
              sorted[k] = value[k];
              return sorted;
          }, {} as any);
      }
      return value;
  }, 2) + "\n";

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, json, { encoding: "utf8" });
}
