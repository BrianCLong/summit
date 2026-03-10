/**
 * Fragment Extractor
 *
 * AST-aware code fragment extraction from git history with:
 * - Symbol anchoring (functions, classes, exports)
 * - Context preservation (imports, dependencies, comments)
 * - Deletion detection (tracks when capabilities disappear)
 * - Temporal metadata (when, why, by whom)
 *
 * Feeds the Reconstruction Engine and Capability Graph.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const execAsync = promisify(exec);

export interface CodeFragment {
  id: string; // SHA-256 of content + metadata
  content: string; // The actual code
  symbols: SymbolInfo[]; // Extracted symbols (functions, classes, exports)
  file_path: string; // Original file path
  lines: { start: number; end: number }; // Line range in original file
  commit_sha: string; // Git commit where this existed
  timestamp: string; // ISO 8601
  author: string; // Git author
  commit_message: string; // Why it was added/removed
  deletion_info?: {
    deleted_in_commit: string;
    deleted_at: string;
    deleted_by: string;
    reason: string;
  };
  dependencies: string[]; // Imported modules/symbols
  exported_symbols: string[]; // What this fragment exports
  complexity_score: number; // Cyclomatic complexity estimate
  category: 'function' | 'class' | 'module' | 'config' | 'test' | 'unknown';
}

export interface SymbolInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'variable' | 'export';
  signature?: string; // For functions: full signature
  visibility: 'public' | 'private' | 'protected' | 'exported';
  line: number;
}

export interface ExtractionConfig {
  repo_path: string;
  output_dir: string;
  file_patterns?: string[]; // e.g., ['*.ts', '*.tsx', '*.js']
  exclude_patterns?: string[]; // e.g., ['node_modules/**', 'dist/**']
  since_commit?: string; // Start from this commit
  until_commit?: string; // End at this commit
  detect_deletions?: boolean; // Track deleted code
  min_fragment_lines?: number; // Minimum fragment size
  max_fragments?: number; // Limit for performance
}

export class FragmentExtractor {
  private config: Required<ExtractionConfig>;
  private extractedFragments: Map<string, CodeFragment> = new Map();
  private deletionCandidates: Set<string> = new Set();

  constructor(config: ExtractionConfig) {
    this.config = {
      output_dir: config.output_dir,
      repo_path: config.repo_path,
      file_patterns: config.file_patterns || ['*.ts', '*.tsx', '*.js', '*.jsx'],
      exclude_patterns: config.exclude_patterns || [
        'node_modules/**',
        'dist/**',
        'build/**',
        '*.test.ts',
        '*.test.js',
      ],
      since_commit: config.since_commit || 'HEAD~100',
      until_commit: config.until_commit || 'HEAD',
      detect_deletions: config.detect_deletions ?? true,
      min_fragment_lines: config.min_fragment_lines || 5,
      max_fragments: config.max_fragments || 10000,
    };
  }

  /**
   * Main extraction pipeline
   */
  async extract(): Promise<CodeFragment[]> {
    console.log('Repository Archaeology: Fragment Extraction starting...');
    console.log(`  Repo: ${this.config.repo_path}`);
    console.log(`  Range: ${this.config.since_commit}..${this.config.until_commit}`);

    // 1. Get all commits in range
    const commits = await this.getCommitHistory();
    console.log(`  Found ${commits.length} commits to analyze`);

    // 2. Extract fragments from each commit
    for (const commit of commits) {
      await this.extractFromCommit(commit);

      if (this.extractedFragments.size >= this.config.max_fragments) {
        console.log(`  Reached max fragments limit (${this.config.max_fragments})`);
        break;
      }
    }

    // 3. Detect deletions if enabled
    if (this.config.detect_deletions) {
      await this.detectDeletions();
    }

    // 4. Save fragments to disk
    await this.saveFragments();

    const fragments = Array.from(this.extractedFragments.values());
    console.log(`Fragment Extraction complete: ${fragments.length} fragments extracted`);
    console.log(`  Deletions detected: ${this.deletionCandidates.size}`);

    return fragments;
  }

  /**
   * Get commit history in range
   */
  private async getCommitHistory(): Promise<CommitInfo[]> {
    const cmd = `git log ${this.config.since_commit}..${this.config.until_commit} --pretty=format:"%H|%an|%ae|%aI|%s" --no-merges`;

    try {
      const { stdout } = await execAsync(cmd, {
        cwd: this.config.repo_path,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      return stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const [sha, author, email, timestamp, ...messageParts] = line.split('|');
          return {
            sha,
            author: `${author} <${email}>`,
            timestamp,
            message: messageParts.join('|'),
          };
        });
    } catch (error) {
      console.error('Failed to get commit history:', error);
      return [];
    }
  }

  /**
   * Extract fragments from a single commit
   */
  private async extractFromCommit(commit: CommitInfo): Promise<void> {
    // Get files changed in this commit
    const cmd = `git show --name-only --pretty=format: ${commit.sha}`;

    try {
      const { stdout } = await execAsync(cmd, {
        cwd: this.config.repo_path,
      });

      const changedFiles = stdout
        .split('\n')
        .filter((line) => line.trim())
        .filter((file) => this.shouldProcessFile(file));

      for (const file of changedFiles) {
        await this.extractFromFile(file, commit);
      }
    } catch (error) {
      console.error(`Failed to extract from commit ${commit.sha}:`, error);
    }
  }

  /**
   * Extract fragments from a file at a specific commit
   */
  private async extractFromFile(filePath: string, commit: CommitInfo): Promise<void> {
    try {
      // Get file content at this commit
      const cmd = `git show ${commit.sha}:${filePath}`;
      const { stdout: content } = await execAsync(cmd, {
        cwd: this.config.repo_path,
        maxBuffer: 1024 * 1024, // 1MB per file
      });

      if (!content || content.length < this.config.min_fragment_lines * 20) {
        return; // Skip tiny files
      }

      // Parse symbols from content
      const symbols = this.extractSymbols(content, filePath);

      if (symbols.length === 0) {
        return; // No symbols found
      }

      // Create fragments for each major symbol
      for (const symbol of symbols) {
        const fragment = await this.createFragment({
          content,
          symbol,
          filePath,
          commit,
        });

        if (fragment) {
          this.extractedFragments.set(fragment.id, fragment);
        }
      }
    } catch (error) {
      // File might not exist at this commit (deleted or renamed)
      // This is expected, skip silently
    }
  }

  /**
   * Extract symbols from code content (simplified AST parsing)
   */
  private extractSymbols(content: string, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    const lines = content.split('\n');

    // Simple regex-based symbol extraction (production would use actual AST parser)
    const patterns = [
      // Functions
      { regex: /export\s+(async\s+)?function\s+(\w+)/g, type: 'function' as const, visibility: 'exported' as const },
      { regex: /function\s+(\w+)/g, type: 'function' as const, visibility: 'public' as const },
      { regex: /const\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*=>/g, type: 'function' as const, visibility: 'public' as const },

      // Classes
      { regex: /export\s+class\s+(\w+)/g, type: 'class' as const, visibility: 'exported' as const },
      { regex: /class\s+(\w+)/g, type: 'class' as const, visibility: 'public' as const },

      // Interfaces/Types
      { regex: /export\s+interface\s+(\w+)/g, type: 'interface' as const, visibility: 'exported' as const },
      { regex: /export\s+type\s+(\w+)/g, type: 'type' as const, visibility: 'exported' as const },

      // Constants
      { regex: /export\s+const\s+(\w+)/g, type: 'const' as const, visibility: 'exported' as const },
    ];

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.regex.exec(line)) !== null) {
          const nameIndex = pattern.type === 'function' && match[2] ? 2 : 1;
          symbols.push({
            name: match[nameIndex],
            type: pattern.type,
            visibility: pattern.visibility,
            line: lineIdx + 1,
          });
        }
      }
    }

    return symbols;
  }

  /**
   * Create a code fragment from symbol info
   */
  private async createFragment(params: {
    content: string;
    symbol: SymbolInfo;
    filePath: string;
    commit: CommitInfo;
  }): Promise<CodeFragment | null> {
    const { content, symbol, filePath, commit } = params;
    const lines = content.split('\n');

    // Extract the symbol's code block
    const startLine = symbol.line - 1;
    let endLine = startLine;

    // Find the end of the symbol (simplified - production would use AST)
    let braceCount = 0;
    let foundStart = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];

      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundStart = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      if (foundStart && braceCount === 0) {
        endLine = i;
        break;
      }
    }

    if (endLine === startLine) {
      endLine = Math.min(startLine + 20, lines.length - 1); // Default to 20 lines
    }

    const fragmentContent = lines.slice(startLine, endLine + 1).join('\n');

    if (fragmentContent.split('\n').length < this.config.min_fragment_lines) {
      return null; // Too small
    }

    // Generate fragment ID
    const id = await this.hashContent(fragmentContent + filePath + symbol.name);

    // Extract dependencies
    const dependencies = this.extractDependencies(content);

    // Determine category
    const category = this.categorizeFragment(filePath, symbol.type);

    // Calculate complexity
    const complexity = this.calculateComplexity(fragmentContent);

    return {
      id,
      content: fragmentContent,
      symbols: [symbol],
      file_path: filePath,
      lines: { start: startLine + 1, end: endLine + 1 },
      commit_sha: commit.sha,
      timestamp: commit.timestamp,
      author: commit.author,
      commit_message: commit.message,
      dependencies,
      exported_symbols: symbol.visibility === 'exported' ? [symbol.name] : [],
      complexity_score: complexity,
      category,
    };
  }

  /**
   * Detect deleted capabilities
   */
  private async detectDeletions(): Promise<void> {
    console.log('Detecting deleted capabilities...');

    // Get all files deleted between since_commit and until_commit
    const cmd = `git diff --name-only --diff-filter=D ${this.config.since_commit} ${this.config.until_commit}`;

    try {
      const { stdout } = await execAsync(cmd, {
        cwd: this.config.repo_path,
      });

      const deletedFiles = stdout
        .split('\n')
        .filter((line) => line.trim())
        .filter((file) => this.shouldProcessFile(file));

      console.log(`  Found ${deletedFiles.length} deleted files`);

      // For each deleted file, extract its last known state
      for (const file of deletedFiles) {
        await this.extractDeletedFile(file);
      }
    } catch (error) {
      console.error('Failed to detect deletions:', error);
    }
  }

  /**
   * Extract fragments from a deleted file
   */
  private async extractDeletedFile(filePath: string): Promise<void> {
    try {
      // Get the commit where the file was deleted
      const logCmd = `git log -1 --pretty=format:"%H|%an|%ae|%aI|%s" --diff-filter=D -- ${filePath}`;
      const { stdout: logOutput } = await execAsync(logCmd, {
        cwd: this.config.repo_path,
      });

      if (!logOutput) return;

      const [sha, author, email, timestamp, ...messageParts] = logOutput.split('|');
      const deletionCommit = {
        sha,
        author: `${author} <${email}>`,
        timestamp,
        message: messageParts.join('|'),
      };

      // Get the file content before deletion
      const showCmd = `git show ${sha}~1:${filePath}`;
      const { stdout: content } = await execAsync(showCmd, {
        cwd: this.config.repo_path,
        maxBuffer: 1024 * 1024,
      });

      // Extract symbols
      const symbols = this.extractSymbols(content, filePath);

      // Create fragments with deletion info
      for (const symbol of symbols) {
        const fragment = await this.createFragment({
          content,
          symbol,
          filePath,
          commit: {
            sha: sha + '~1', // Parent commit (before deletion)
            author: deletionCommit.author,
            timestamp: deletionCommit.timestamp,
            message: `Before deletion: ${deletionCommit.message}`,
          },
        });

        if (fragment) {
          fragment.deletion_info = {
            deleted_in_commit: deletionCommit.sha,
            deleted_at: deletionCommit.timestamp,
            deleted_by: deletionCommit.author,
            reason: deletionCommit.message,
          };

          this.extractedFragments.set(fragment.id, fragment);
          this.deletionCandidates.add(fragment.id);
        }
      }
    } catch (error) {
      // File deletion detection failed, skip
    }
  }

  /**
   * Extract import dependencies from content
   */
  private extractDependencies(content: string): string[] {
    const deps: string[] = [];
    const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      deps.push(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      deps.push(match[1]);
    }

    return [...new Set(deps)]; // Deduplicate
  }

  /**
   * Categorize fragment type
   */
  private categorizeFragment(
    filePath: string,
    symbolType: SymbolInfo['type']
  ): CodeFragment['category'] {
    if (filePath.includes('.test.') || filePath.includes('/__tests__/')) {
      return 'test';
    }
    if (filePath.includes('config') || filePath.endsWith('.json')) {
      return 'config';
    }
    if (symbolType === 'class') {
      return 'class';
    }
    if (symbolType === 'function') {
      return 'function';
    }
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return 'module';
    }
    return 'unknown';
  }

  /**
   * Calculate cyclomatic complexity (simplified)
   */
  private calculateComplexity(content: string): number {
    // Count decision points: if, else, for, while, case, catch, &&, ||, ?
    const patterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\belse\s*\{/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /&&/g,
      /\|\|/g,
      /\?/g,
    ];

    let complexity = 1; // Base complexity

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Check if file should be processed
   */
  private shouldProcessFile(filePath: string): boolean {
    // Check exclude patterns
    for (const pattern of this.config.exclude_patterns) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      if (regex.test(filePath)) {
        return false;
      }
    }

    // Check include patterns
    for (const pattern of this.config.file_patterns) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      if (regex.test(filePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Save fragments to disk
   */
  private async saveFragments(): Promise<void> {
    await fs.mkdir(this.config.output_dir, { recursive: true });

    const fragmentsArray = Array.from(this.extractedFragments.values());
    const outputPath = path.join(this.config.output_dir, 'fragments.json');

    await fs.writeFile(
      outputPath,
      JSON.stringify(
        {
          extracted_at: new Date().toISOString(),
          repo_path: this.config.repo_path,
          commit_range: `${this.config.since_commit}..${this.config.until_commit}`,
          total_fragments: fragmentsArray.length,
          deletions_detected: this.deletionCandidates.size,
          fragments: fragmentsArray,
        },
        null,
        2
      )
    );

    console.log(`Fragments saved to: ${outputPath}`);
  }

  /**
   * Hash content for ID generation
   */
  private async hashContent(content: string): Promise<string> {
    const crypto = await import('node:crypto');
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get extraction statistics
   */
  getStats(): ExtractionStats {
    const fragments = Array.from(this.extractedFragments.values());

    return {
      total_fragments: fragments.length,
      deletions_detected: this.deletionCandidates.size,
      categories: this.countByCategory(fragments),
      avg_complexity: this.calculateAvgComplexity(fragments),
      total_loc: fragments.reduce(
        (sum, f) => sum + (f.lines.end - f.lines.start + 1),
        0
      ),
    };
  }

  private countByCategory(fragments: CodeFragment[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const fragment of fragments) {
      counts[fragment.category] = (counts[fragment.category] || 0) + 1;
    }
    return counts;
  }

  private calculateAvgComplexity(fragments: CodeFragment[]): number {
    if (fragments.length === 0) return 0;
    const sum = fragments.reduce((s, f) => s + f.complexity_score, 0);
    return Math.round((sum / fragments.length) * 10) / 10;
  }
}

interface CommitInfo {
  sha: string;
  author: string;
  timestamp: string;
  message: string;
}

interface ExtractionStats {
  total_fragments: number;
  deletions_detected: number;
  categories: Record<string, number>;
  avg_complexity: number;
  total_loc: number;
}
