import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { type SkillpackFrontmatter } from './types';

const FRONTMATTER_DELIMITER = '---';

export function assertDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

export function ensureArray<T>(value: T[] | undefined, fallback: T[] = []): T[] {
  return value ?? fallback;
}

export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function parseFrontmatter(markdown: string): SkillpackFrontmatter {
  const trimmed = markdown.trimStart();
  if (!trimmed.startsWith(FRONTMATTER_DELIMITER)) {
    throw new Error('SKILL.md is missing frontmatter delimiter.');
  }
  const parts = trimmed.split(FRONTMATTER_DELIMITER);
  if (parts.length < 3) {
    throw new Error('SKILL.md frontmatter is incomplete.');
  }
  const yamlBlock = parts[1];
  const parsed = yaml.load(yamlBlock);
  if (!isSkillpackFrontmatter(parsed)) {
    throw new Error('SKILL.md frontmatter did not match expected schema.');
  }
  return parsed;
}

function isSkillpackFrontmatter(value: unknown): value is SkillpackFrontmatter {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === 'string' &&
    typeof record.description === 'string' &&
    Array.isArray(record.triggers) &&
    record.triggers.every((item) => typeof item === 'string')
  );
}

export function joinPath(...parts: string[]): string {
  return path.join(...parts);
}

export function normalizePath(value: string): string {
  return value.split(path.sep).join('/');
}
