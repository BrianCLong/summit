import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import parser from '@typescript-eslint/parser';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';
import srplPlugin from '../../src/plugin/index.js';

const CASES_ROOT = fileURLToPath(new URL('./cases', import.meta.url));

async function listCases(): Promise<string[]> {
  const entries = await readdir(CASES_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const CASE_NAMES = await listCases();

describe('srpl/no-unsafe-retrieval golden fixtures', () => {
  it('has at least one fixture', () => {
    expect(CASE_NAMES.length).toBeGreaterThan(0);
  });

  for (const caseName of CASE_NAMES) {
    it(caseName, async () => {
      const caseDir = join(CASES_ROOT, caseName);
      const inputPath = join(caseDir, 'input.ts');
      const expectedPath = join(caseDir, 'expected-fixed.ts');
      const hasExpected = await stat(expectedPath).then(
        () => true,
        () => false,
      );

      const run = async (fix: boolean) => {
        const eslint = new ESLint({
          fix,
          overrideConfigFile: true,
          overrideConfig: [
            {
              files: ['**/*.*'],
              plugins: {
                srpl: srplPlugin,
              },
              rules: {
                'srpl/no-unsafe-retrieval': 'error',
              },
              languageOptions: {
                parser,
                parserOptions: {
                  ecmaVersion: 'latest',
                  sourceType: 'module',
                },
              },
            },
          ],
        });
        const [result] = await eslint.lintFiles([inputPath]);
        return result;
      };

      const first = await run(false);
      const second = await run(false);
      expect(first.errorCount).toEqual(second.errorCount);
      expect(first.warningCount).toEqual(second.warningCount);
      expect(first.messages).toEqual(second.messages);

      if (hasExpected) {
        expect(first.errorCount).toBeGreaterThan(0);
        const fixed = await run(true);
        const expectedFixed = await readFile(expectedPath, 'utf8');
        expect((fixed.output ?? '').trim()).toEqual(expectedFixed.trim());
        const secondFixed = await run(true);
        expect(secondFixed.output).toEqual(fixed.output);
      } else {
        expect(first.errorCount).toBe(0);
        expect(first.warningCount).toBe(0);
        const fixed = await run(true);
        expect(fixed.output).toBeUndefined();
      }
    });
  }
});
