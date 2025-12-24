import fs from 'node:fs';
import path from 'node:path';

export async function listRecipes() {
  const dir = path.join(process.cwd(), 'recipes');
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'));
  } catch {
    return [];
  }
}

export async function loadRecipe(name: string) {
  const p = path.join(process.cwd(), 'recipes', name);
  const y = fs.readFileSync(p, 'utf8');
  // Lazy import to avoid bundling when not needed
  try {
    const YAML = (await import('yaml')).default as any;
    return YAML.parse(y);
  } catch {
    return { __error: 'YAML module not installed', raw: y } as any;
  }
}
