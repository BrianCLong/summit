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
  const recipesDir = path.resolve(process.cwd(), 'recipes');
  const targetPath = path.resolve(recipesDir, name);

  // Prevent path traversal
  if (!targetPath.startsWith(recipesDir + path.sep)) {
    return { __error: 'Invalid recipe path', raw: '' } as any;
  }

  try {
    const y = fs.readFileSync(targetPath, 'utf8');
    // Lazy import to avoid bundling when not needed
    const YAML = (await import('yaml')).default as any;
    return YAML.parse(y);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
         return { __error: 'Recipe not found', raw: '' } as any;
    }
    return { __error: 'YAML module not installed', raw: '' } as any;
  }
}
