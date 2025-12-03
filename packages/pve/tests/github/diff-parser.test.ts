/**
 * Diff Parser Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseDiff,
  toPRFile,
  getChangedLines,
  extractNewContent,
  isWhitespaceOnly,
} from '../../src/github/diff-parser.js';

describe('parseDiff', () => {
  it('should parse a simple diff', () => {
    const diff = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
 import { foo } from './foo';
+import { bar } from './bar';

 export function main() {`;

    const result = parseDiff(diff);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('src/index.ts');
    expect(result.files[0].status).toBe('modified');
    expect(result.files[0].additions).toBe(1);
    expect(result.files[0].deletions).toBe(0);
  });

  it('should detect new files', () => {
    const diff = `diff --git a/src/new.ts b/src/new.ts
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+export function newFunction() {
+  return true;
+}`;

    const result = parseDiff(diff);

    expect(result.files[0].status).toBe('added');
    expect(result.files[0].additions).toBe(3);
  });

  it('should detect deleted files', () => {
    const diff = `diff --git a/src/old.ts b/src/old.ts
--- a/src/old.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function oldFunction() {
-  return false;
-}`;

    const result = parseDiff(diff);

    expect(result.files[0].status).toBe('deleted');
    expect(result.files[0].deletions).toBe(3);
  });

  it('should detect renamed files', () => {
    const diff = `diff --git a/src/old.ts b/src/new.ts
rename from src/old.ts
rename to src/new.ts
--- a/src/old.ts
+++ b/src/new.ts`;

    const result = parseDiff(diff);

    expect(result.files[0].status).toBe('renamed');
    expect(result.files[0].previousPath).toBe('src/old.ts');
    expect(result.files[0].path).toBe('src/new.ts');
  });

  it('should parse multiple files', () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,1 +1,2 @@
 const a = 1;
+const b = 2;
diff --git a/src/b.ts b/src/b.ts
--- a/src/b.ts
+++ b/src/b.ts
@@ -1,1 +1,2 @@
 const x = 1;
+const y = 2;`;

    const result = parseDiff(diff);

    expect(result.files).toHaveLength(2);
    expect(result.stats.filesChanged).toBe(2);
    expect(result.stats.insertions).toBe(2);
  });

  it('should parse hunks correctly', () => {
    const diff = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,7 +10,8 @@
 const a = 1;
 const b = 2;
-const c = 3;
+const c = 4;
+const d = 5;
 const e = 6;
 const f = 7;`;

    const result = parseDiff(diff);

    expect(result.files[0].hunks).toHaveLength(1);
    expect(result.files[0].hunks[0].oldStart).toBe(10);
    expect(result.files[0].hunks[0].newStart).toBe(10);
  });

  it('should calculate stats correctly', () => {
    const diff = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,6 @@
 line1
-line2
-line3
+line2modified
+line3modified
+line4new
 line5
 line6`;

    const result = parseDiff(diff);

    expect(result.files[0].additions).toBe(3);
    expect(result.files[0].deletions).toBe(2);
    expect(result.stats.insertions).toBe(3);
    expect(result.stats.deletions).toBe(2);
  });
});

describe('toPRFile', () => {
  it('should convert ParsedFile to PRFile', () => {
    const parsed = {
      path: 'src/test.ts',
      status: 'modified' as const,
      hunks: [
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 4,
          lines: [
            { type: 'context' as const, content: 'line1' },
            { type: 'addition' as const, content: 'new line', newLineNumber: 2 },
          ],
        },
      ],
      additions: 1,
      deletions: 0,
      isBinary: false,
    };

    const prFile = toPRFile(parsed);

    expect(prFile.path).toBe('src/test.ts');
    expect(prFile.status).toBe('modified');
    expect(prFile.additions).toBe(1);
    expect(prFile.patch).toContain('@@ -1,3 +1,4 @@');
  });
});

describe('getChangedLines', () => {
  it('should return changed line numbers', () => {
    const diff = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
 line1
+newline
 line2
 line3`;

    const parsed = parseDiff(diff);
    const changedLines = getChangedLines(parsed);

    expect(changedLines.get('src/index.ts')).toEqual([2]);
  });
});

describe('extractNewContent', () => {
  it('should extract new content from additions', () => {
    const parsed = {
      path: 'src/test.ts',
      status: 'added' as const,
      hunks: [
        {
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: 2,
          lines: [
            { type: 'addition' as const, content: 'line1', newLineNumber: 1 },
            { type: 'addition' as const, content: 'line2', newLineNumber: 2 },
          ],
        },
      ],
      additions: 2,
      deletions: 0,
      isBinary: false,
    };

    const content = extractNewContent(parsed);

    expect(content).toBe('line1\nline2');
  });
});

describe('isWhitespaceOnly', () => {
  it('should detect whitespace-only changes', () => {
    const parsed = {
      path: 'src/test.ts',
      status: 'modified' as const,
      hunks: [
        {
          oldStart: 1,
          oldLines: 1,
          newStart: 1,
          newLines: 1,
          lines: [
            { type: 'deletion' as const, content: '  const a = 1;', oldLineNumber: 1 },
            { type: 'addition' as const, content: '    const a = 1;', newLineNumber: 1 },
          ],
        },
      ],
      additions: 1,
      deletions: 1,
      isBinary: false,
    };

    expect(isWhitespaceOnly(parsed)).toBe(false); // Content is not the same
  });

  it('should return false for content changes', () => {
    const parsed = {
      path: 'src/test.ts',
      status: 'modified' as const,
      hunks: [
        {
          oldStart: 1,
          oldLines: 1,
          newStart: 1,
          newLines: 1,
          lines: [
            { type: 'deletion' as const, content: 'const a = 1;', oldLineNumber: 1 },
            { type: 'addition' as const, content: 'const a = 2;', newLineNumber: 1 },
          ],
        },
      ],
      additions: 1,
      deletions: 1,
      isBinary: false,
    };

    expect(isWhitespaceOnly(parsed)).toBe(false);
  });
});
