import { readFile } from 'fs/promises';

export interface PackageJson {
  name: string;
  scripts?: { [key: string]: string };
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
}

export async function checkMixedTestRunners(pkgPath: string): Promise<boolean> {
  const pkgContent = await readFile(pkgPath, 'utf-8');
  const pkgJson = JSON.parse(pkgContent) as PackageJson;
  const devDependencies = pkgJson.devDependencies || {};
  return 'jest' in devDependencies && 'vitest' in devDependencies;
}
