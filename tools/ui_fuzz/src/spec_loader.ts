import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SpecModule } from './types.js';

export const loadSpecModule = async (specPath?: string): Promise<SpecModule | null> => {
  if (!specPath) return null;
  const absolute = path.isAbsolute(specPath) ? specPath : path.join(process.cwd(), specPath);
  const moduleUrl = pathToFileURL(absolute).toString();
  const imported = (await import(moduleUrl)) as SpecModule;
  return imported;
};
