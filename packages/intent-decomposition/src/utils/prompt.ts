import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

export interface PromptTemplate {
  id: string;
  version: string;
  content: string;
  sha256: string;
}

export async function loadPromptTemplate(
  filePath: string,
  id: string,
  version: string,
): Promise<PromptTemplate> {
  const content = await readFile(filePath, 'utf8');
  const sha256 = createHash('sha256').update(content).digest('hex');
  return { id, version, content, sha256 };
}

export function fillTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return Object.entries(variables).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template,
  );
}
