/**
 * Git Diff Parser
 *
 * Parses git diff output into structured data.
 *
 * @module pve/github/diff-parser
 */

import type { PRFile } from '../types/index.js';

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface ParsedDiff {
  files: ParsedFile[];
  stats: DiffStats;
}

export interface ParsedFile {
  path: string;
  previousPath?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isBinary: boolean;
}

export interface DiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

/**
 * Parse a unified diff string into structured data
 */
export function parseDiff(diffString: string): ParsedDiff {
  const lines = diffString.split('\n');
  const files: ParsedFile[] = [];
  let currentFile: ParsedFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // New file header
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        files.push(currentFile);
      }
      currentFile = {
        path: '',
        status: 'modified',
        hunks: [],
        additions: 0,
        deletions: 0,
        isBinary: false,
      };
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    // File paths
    if (line.startsWith('--- ')) {
      const path = line.slice(4);
      if (path === '/dev/null') {
        currentFile.status = 'added';
      } else {
        currentFile.previousPath = path.replace(/^[ab]\//, '');
      }
      continue;
    }

    if (line.startsWith('+++ ')) {
      const path = line.slice(4);
      if (path === '/dev/null') {
        currentFile.status = 'deleted';
      } else {
        currentFile.path = path.replace(/^[ab]\//, '');
      }
      continue;
    }

    // Rename detection
    if (line.startsWith('rename from ')) {
      currentFile.previousPath = line.slice(12);
      currentFile.status = 'renamed';
      continue;
    }

    if (line.startsWith('rename to ')) {
      currentFile.path = line.slice(10);
      continue;
    }

    // Binary file
    if (line.includes('Binary files')) {
      currentFile.isBinary = true;
      continue;
    }

    // Hunk header
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunkMatch) {
      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: parseInt(hunkMatch[2] || '1', 10),
        newStart: parseInt(hunkMatch[3], 10),
        newLines: parseInt(hunkMatch[4] || '1', 10),
        lines: [],
      };
      currentFile.hunks.push(currentHunk);
      oldLineNum = currentHunk.oldStart;
      newLineNum = currentHunk.newStart;
      continue;
    }

    // Diff content
    if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
      const diffLine: DiffLine = {
        type: line.startsWith('+') ? 'addition' : line.startsWith('-') ? 'deletion' : 'context',
        content: line.slice(1),
      };

      if (diffLine.type === 'addition') {
        diffLine.newLineNumber = newLineNum++;
        currentFile.additions++;
      } else if (diffLine.type === 'deletion') {
        diffLine.oldLineNumber = oldLineNum++;
        currentFile.deletions++;
      } else {
        diffLine.oldLineNumber = oldLineNum++;
        diffLine.newLineNumber = newLineNum++;
      }

      currentHunk.lines.push(diffLine);
    }
  }

  // Don't forget the last file
  if (currentFile && currentFile.path) {
    files.push(currentFile);
  }

  const stats: DiffStats = {
    filesChanged: files.length,
    insertions: files.reduce((sum, f) => sum + f.additions, 0),
    deletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };

  return { files, stats };
}

/**
 * Convert ParsedFile to PRFile format
 */
export function toPRFile(parsed: ParsedFile): PRFile {
  return {
    path: parsed.path,
    previousPath: parsed.previousPath,
    status: parsed.status,
    additions: parsed.additions,
    deletions: parsed.deletions,
    patch: formatPatch(parsed.hunks),
  };
}

/**
 * Format hunks back into patch string
 */
function formatPatch(hunks: DiffHunk[]): string {
  const lines: string[] = [];

  for (const hunk of hunks) {
    lines.push(
      `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
    );
    for (const line of hunk.lines) {
      const prefix = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';
      lines.push(`${prefix}${line.content}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get changed lines from a diff
 */
export function getChangedLines(diff: ParsedDiff): Map<string, number[]> {
  const result = new Map<string, number[]>();

  for (const file of diff.files) {
    const lines: number[] = [];
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'addition' && line.newLineNumber !== undefined) {
          lines.push(line.newLineNumber);
        }
      }
    }
    if (lines.length > 0) {
      result.set(file.path, lines);
    }
  }

  return result;
}

/**
 * Extract file content from additions only
 */
export function extractNewContent(parsed: ParsedFile): string {
  const lines: string[] = [];

  for (const hunk of parsed.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'addition' || line.type === 'context') {
        lines.push(line.content);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Check if diff contains only whitespace changes
 */
export function isWhitespaceOnly(parsed: ParsedFile): boolean {
  for (const hunk of parsed.hunks) {
    for (const line of hunk.lines) {
      if (line.type !== 'context') {
        const content = line.content.trim();
        if (content.length > 0) {
          return false;
        }
      }
    }
  }
  return true;
}
