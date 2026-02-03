import { createHash } from 'crypto';

export function generateEvidenceId(type: string, date: string, content: any): string {
  const canonical = JSON.stringify(content, Object.keys(content).sort());
  const hash = createHash('sha256').update(canonical).digest('hex').substring(0, 8);
  const formattedDate = date.replace(/-/g, '');
  return `EVD-${type.toUpperCase()}-${formattedDate}-${hash}`;
}

export function createDeterministicArtifact(content: any) {
  // Ensure stable property ordering
  const stableContent = sortObjectKeys(content);
  return stableContent;
}

function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    }
    return obj;
  }

  return Object.keys(obj)
    .sort()
    .reduce((acc: any, key: string) => {
      acc[key] = sortObjectKeys(obj[key]);
      return acc;
    }, {});
}
