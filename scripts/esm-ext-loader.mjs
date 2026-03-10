/**
 * Minimal ESM loader that adds file extensions to extensionless relative imports.
 * Tries .js first (compiled artifacts), then .ts (TypeScript sources).
 * Required because Node 22 ESM mandates explicit extensions in specifiers.
 */
import { resolve as pathResolve, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const EXTS = ['.js', '.ts', '.mjs'];

export async function resolve(specifier, context, nextResolve) {
  if (extname(specifier) || !specifier.startsWith('.')) {
    return nextResolve(specifier, context);
  }
  if (context.parentURL) {
    const parentDir = fileURLToPath(new URL('.', context.parentURL));
    for (const ext of EXTS) {
      const full = pathResolve(parentDir, specifier + ext);
      if (existsSync(full)) {
        return nextResolve(pathToFileURL(full).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
