/**
 * Subsystem Inference Engine
 *
 * Infers logical subsystem boundaries from code fragments using:
 * - Co-change pattern detection (files changed together)
 * - Dependency clustering (import/export relationships)
 * - Semantic similarity (content-based grouping)
 * - Temporal correlation (changes made in same time windows)
 *
 * Produces subsystem maps that help identify architectural components
 * and guide reconstruction priorities.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CodeFragment } from './fragment-extractor.js';

export interface Subsystem {
  id: string; // Generated subsystem ID
  name: string; // Inferred subsystem name
  fragments: string[]; // Fragment IDs belonging to this subsystem
  file_patterns: string[]; // Common file paths/patterns
  primary_symbols: string[]; // Most important exported symbols
  dependencies: string[]; // External dependencies
  internal_dependencies: string[]; // Dependencies on other subsystems
  coherence_score: number; // How tightly related the fragments are (0-1)
  confidence: 'high' | 'medium' | 'low';
  characteristics: {
    avg_complexity: number;
    total_loc: number;
    change_frequency: number; // How often this subsystem changed
    primary_authors: string[];
    category: SubsystemCategory;
  };
}

export type SubsystemCategory =
  | 'core-platform'
  | 'api-layer'
  | 'data-layer'
  | 'ui-component'
  | 'utility'
  | 'integration'
  | 'infrastructure'
  | 'test-support'
  | 'unknown';

export interface CoChangePattern {
  files: string[];
  frequency: number; // How many times they changed together
  time_span: { start: string; end: string };
  commit_shas: string[];
  confidence: number; // 0-1
}

export interface SubsystemInferenceConfig {
  fragments_file: string; // Path to fragments.json from FragmentExtractor
  output_dir: string;
  min_subsystem_size?: number; // Minimum fragments per subsystem
  similarity_threshold?: number; // For clustering (0-1)
  co_change_threshold?: number; // Minimum co-changes to consider
}

export class SubsystemInferenceEngine {
  private config: Required<SubsystemInferenceConfig>;
  private fragments: CodeFragment[] = [];
  private subsystems: Subsystem[] = [];
  private coChangePatterns: CoChangePattern[] = [];

  constructor(config: SubsystemInferenceConfig) {
    this.config = {
      fragments_file: config.fragments_file,
      output_dir: config.output_dir,
      min_subsystem_size: config.min_subsystem_size || 3,
      similarity_threshold: config.similarity_threshold || 0.7,
      co_change_threshold: config.co_change_threshold || 3,
    };
  }

  /**
   * Main inference pipeline
   */
  async infer(): Promise<Subsystem[]> {
    console.log('Subsystem Inference: Starting analysis...');

    // 1. Load fragments
    await this.loadFragments();
    console.log(`  Loaded ${this.fragments.length} fragments`);

    // 2. Detect co-change patterns
    await this.detectCoChangePatterns();
    console.log(`  Detected ${this.coChangePatterns.length} co-change patterns`);

    // 3. Build dependency graph
    const depGraph = this.buildDependencyGraph();
    console.log(`  Built dependency graph with ${depGraph.size} nodes`);

    // 4. Cluster fragments into subsystems
    await this.clusterFragments(depGraph);
    console.log(`  Inferred ${this.subsystems.length} subsystems`);

    // 5. Calculate subsystem characteristics
    this.calculateSubsystemCharacteristics();

    // 6. Identify internal dependencies between subsystems
    this.identifySubsystemDependencies();

    // 7. Save results
    await this.saveResults();

    console.log(`Subsystem Inference complete: ${this.subsystems.length} subsystems identified`);
    return this.subsystems;
  }

  /**
   * Load fragments from extraction output
   */
  private async loadFragments(): Promise<void> {
    const data = await fs.readFile(this.config.fragments_file, 'utf8');
    const parsed = JSON.parse(data);
    this.fragments = parsed.fragments || [];
  }

  /**
   * Detect co-change patterns (files that change together)
   */
  private async detectCoChangePatterns(): Promise<void> {
    // Group fragments by commit
    const commitGroups = new Map<string, CodeFragment[]>();

    for (const fragment of this.fragments) {
      const commits = commitGroups.get(fragment.commit_sha) || [];
      commits.push(fragment);
      commitGroups.set(fragment.commit_sha, commits);
    }

    // Find file groups that appear together frequently
    const filePairCounts = new Map<string, number>();
    const filePairCommits = new Map<string, Set<string>>();

    for (const [commitSha, fragments] of commitGroups.entries()) {
      const files = [...new Set(fragments.map((f) => f.file_path))].sort();

      // Record all pairs
      for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
          const pairKey = `${files[i]}::${files[j]}`;
          filePairCounts.set(pairKey, (filePairCounts.get(pairKey) || 0) + 1);

          if (!filePairCommits.has(pairKey)) {
            filePairCommits.set(pairKey, new Set());
          }
          filePairCommits.get(pairKey)!.add(commitSha);
        }
      }
    }

    // Extract significant co-change patterns
    for (const [pairKey, count] of filePairCounts.entries()) {
      if (count >= this.config.co_change_threshold) {
        const [file1, file2] = pairKey.split('::');
        const commits = Array.from(filePairCommits.get(pairKey) || []);

        // Get time span
        const timestamps = commits
          .map((sha) => {
            const frag = this.fragments.find((f) => f.commit_sha === sha);
            return frag ? new Date(frag.timestamp) : null;
          })
          .filter((t): t is Date => t !== null)
          .sort((a, b) => a.getTime() - b.getTime());

        if (timestamps.length > 0) {
          this.coChangePatterns.push({
            files: [file1, file2],
            frequency: count,
            time_span: {
              start: timestamps[0].toISOString(),
              end: timestamps[timestamps.length - 1].toISOString(),
            },
            commit_shas: commits,
            confidence: Math.min(count / 10, 1.0), // Normalize confidence
          });
        }
      }
    }

    // Sort by frequency
    this.coChangePatterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Build dependency graph from imports/exports
   */
  private buildDependencyGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const fragment of this.fragments) {
      const deps = graph.get(fragment.id) || new Set();

      // Add dependencies based on imports
      for (const dep of fragment.dependencies) {
        // Find fragments that export this dependency
        const providers = this.fragments.filter((f) =>
          f.exported_symbols.some((sym) => dep.includes(sym))
        );

        for (const provider of providers) {
          deps.add(provider.id);
        }
      }

      graph.set(fragment.id, deps);
    }

    return graph;
  }

  /**
   * Cluster fragments into subsystems
   */
  private async clusterFragments(depGraph: Map<string, Set<string>>): Promise<void> {
    // Create similarity matrix
    const n = this.fragments.length;
    const similarity = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));

    // Calculate pairwise similarity
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const sim = this.calculateFragmentSimilarity(
          this.fragments[i],
          this.fragments[j],
          depGraph
        );
        similarity[i][j] = sim;
        similarity[j][i] = sim;
      }
      similarity[i][i] = 1.0; // Self-similarity
    }

    // Hierarchical clustering (simplified)
    const clusters = this.hierarchicalClustering(similarity);

    // Convert clusters to subsystems
    let subsystemId = 1;
    for (const cluster of clusters) {
      if (cluster.length >= this.config.min_subsystem_size) {
        const fragmentIds = cluster.map((idx) => this.fragments[idx].id);
        const subsystem = this.createSubsystem(subsystemId, fragmentIds);
        this.subsystems.push(subsystem);
        subsystemId++;
      }
    }
  }

  /**
   * Calculate similarity between two fragments
   */
  private calculateFragmentSimilarity(
    f1: CodeFragment,
    f2: CodeFragment,
    depGraph: Map<string, Set<string>>
  ): number {
    let score = 0;
    let weights = 0;

    // 1. Path similarity (files in same directory)
    const pathSim = this.pathSimilarity(f1.file_path, f2.file_path);
    score += pathSim * 0.3;
    weights += 0.3;

    // 2. Dependency overlap
    const depSim = this.dependencyOverlap(f1.dependencies, f2.dependencies);
    score += depSim * 0.2;
    weights += 0.2;

    // 3. Co-change frequency
    const coChangeSim = this.coChangeFrequency(f1.file_path, f2.file_path);
    score += coChangeSim * 0.3;
    weights += 0.3;

    // 4. Category similarity
    if (f1.category === f2.category) {
      score += 0.2;
    }
    weights += 0.2;

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Path similarity (shared directory depth)
   */
  private pathSimilarity(path1: string, path2: string): number {
    const parts1 = path1.split('/');
    const parts2 = path2.split('/');
    const minLen = Math.min(parts1.length, parts2.length);

    let commonDepth = 0;
    for (let i = 0; i < minLen - 1; i++) {
      // Exclude filename
      if (parts1[i] === parts2[i]) {
        commonDepth++;
      } else {
        break;
      }
    }

    return commonDepth / Math.max(parts1.length - 1, parts2.length - 1, 1);
  }

  /**
   * Dependency overlap (Jaccard similarity)
   */
  private dependencyOverlap(deps1: string[], deps2: string[]): number {
    if (deps1.length === 0 && deps2.length === 0) return 0;

    const set1 = new Set(deps1);
    const set2 = new Set(deps2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Co-change frequency between two files
   */
  private coChangeFrequency(file1: string, file2: string): number {
    const pattern = this.coChangePatterns.find(
      (p) =>
        (p.files.includes(file1) && p.files.includes(file2)) ||
        (p.files.includes(file2) && p.files.includes(file1))
    );

    return pattern ? Math.min(pattern.confidence, 1.0) : 0;
  }

  /**
   * Simplified hierarchical clustering
   */
  private hierarchicalClustering(similarity: number[][]): number[][] {
    const n = similarity.length;
    const clusters: number[][] = [];

    // Initialize each fragment as its own cluster
    const assigned = new Array(n).fill(false);

    for (let i = 0; i < n; i++) {
      if (assigned[i]) continue;

      const cluster = [i];
      assigned[i] = true;

      // Find similar fragments
      for (let j = i + 1; j < n; j++) {
        if (assigned[j]) continue;

        if (similarity[i][j] >= this.config.similarity_threshold) {
          cluster.push(j);
          assigned[j] = true;
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Create subsystem from fragment IDs
   */
  private createSubsystem(id: number, fragmentIds: string[]): Subsystem {
    const fragments = fragmentIds
      .map((fid) => this.fragments.find((f) => f.id === fid))
      .filter((f): f is CodeFragment => f !== undefined);

    // Extract common file patterns
    const filePaths = fragments.map((f) => f.file_path);
    const filePatterns = this.extractFilePatterns(filePaths);

    // Extract primary symbols
    const allSymbols = fragments.flatMap((f) => f.exported_symbols);
    const symbolCounts = new Map<string, number>();
    for (const sym of allSymbols) {
      symbolCounts.set(sym, (symbolCounts.get(sym) || 0) + 1);
    }
    const primarySymbols = Array.from(symbolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sym]) => sym);

    // Collect dependencies
    const allDeps = new Set<string>();
    for (const frag of fragments) {
      for (const dep of frag.dependencies) {
        allDeps.add(dep);
      }
    }

    // Calculate coherence score (how tightly related)
    const coherence = this.calculateCoherence(fragments);

    // Infer subsystem name from file patterns
    const name = this.inferSubsystemName(filePatterns, primarySymbols);

    // Determine confidence
    const confidence = coherence > 0.7 ? 'high' : coherence > 0.4 ? 'medium' : 'low';

    return {
      id: `subsystem_${String(id).padStart(3, '0')}`,
      name,
      fragments: fragmentIds,
      file_patterns: filePatterns,
      primary_symbols: primarySymbols,
      dependencies: Array.from(allDeps),
      internal_dependencies: [], // Filled later
      coherence_score: coherence,
      confidence,
      characteristics: {
        avg_complexity: 0, // Filled later
        total_loc: 0,
        change_frequency: 0,
        primary_authors: [],
        category: 'unknown',
      },
    };
  }

  /**
   * Extract common file patterns
   */
  private extractFilePatterns(filePaths: string[]): string[] {
    const patterns = new Map<string, number>();

    for (const path of filePaths) {
      const parts = path.split('/');

      // Extract directory patterns
      for (let i = 1; i < parts.length; i++) {
        const pattern = parts.slice(0, i).join('/') + '/**';
        patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
      }
    }

    // Return patterns that cover most files
    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern]) => pattern);
  }

  /**
   * Calculate subsystem coherence
   */
  private calculateCoherence(fragments: CodeFragment[]): number {
    if (fragments.length < 2) return 1.0;

    let totalSim = 0;
    let count = 0;

    for (let i = 0; i < fragments.length; i++) {
      for (let j = i + 1; j < fragments.length; j++) {
        totalSim += this.calculateFragmentSimilarity(fragments[i], fragments[j], new Map());
        count++;
      }
    }

    return count > 0 ? totalSim / count : 0;
  }

  /**
   * Infer subsystem name from patterns and symbols
   */
  private inferSubsystemName(patterns: string[], symbols: string[]): string {
    // Try to extract name from file patterns
    if (patterns.length > 0) {
      const parts = patterns[0].split('/').filter((p) => p !== '**' && p !== '');
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        return this.capitalize(lastPart.replace(/[-_]/g, ' '));
      }
    }

    // Try to extract from primary symbols
    if (symbols.length > 0) {
      return this.capitalize(symbols[0].replace(/([A-Z])/g, ' $1').trim());
    }

    return 'Unknown Subsystem';
  }

  /**
   * Calculate subsystem characteristics
   */
  private calculateSubsystemCharacteristics(): void {
    for (const subsystem of this.subsystems) {
      const fragments = subsystem.fragments
        .map((fid) => this.fragments.find((f) => f.id === fid))
        .filter((f): f is CodeFragment => f !== undefined);

      if (fragments.length === 0) continue;

      // Average complexity
      subsystem.characteristics.avg_complexity =
        fragments.reduce((sum, f) => sum + f.complexity_score, 0) / fragments.length;

      // Total LOC
      subsystem.characteristics.total_loc = fragments.reduce(
        (sum, f) => sum + (f.lines.end - f.lines.start + 1),
        0
      );

      // Change frequency (unique commits)
      const uniqueCommits = new Set(fragments.map((f) => f.commit_sha));
      subsystem.characteristics.change_frequency = uniqueCommits.size;

      // Primary authors
      const authorCounts = new Map<string, number>();
      for (const frag of fragments) {
        authorCounts.set(frag.author, (authorCounts.get(frag.author) || 0) + 1);
      }
      subsystem.characteristics.primary_authors = Array.from(authorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([author]) => author);

      // Category inference
      subsystem.characteristics.category = this.inferCategory(fragments);
    }
  }

  /**
   * Infer subsystem category
   */
  private inferCategory(fragments: CodeFragment[]): SubsystemCategory {
    const paths = fragments.map((f) => f.file_path);

    // Category heuristics
    if (paths.some((p) => p.includes('/api/') || p.includes('/routes/'))) {
      return 'api-layer';
    }
    if (paths.some((p) => p.includes('/db/') || p.includes('/models/'))) {
      return 'data-layer';
    }
    if (paths.some((p) => p.includes('/components/') || p.includes('/ui/'))) {
      return 'ui-component';
    }
    if (paths.some((p) => p.includes('/utils/') || p.includes('/helpers/'))) {
      return 'utility';
    }
    if (paths.some((p) => p.includes('/connectors/') || p.includes('/integrations/'))) {
      return 'integration';
    }
    if (paths.some((p) => p.includes('/infra/') || p.includes('/terraform/'))) {
      return 'infrastructure';
    }
    if (paths.some((p) => p.includes('test') || p.includes('spec'))) {
      return 'test-support';
    }
    if (paths.some((p) => p.includes('/core/') || p.includes('/kernel/'))) {
      return 'core-platform';
    }

    return 'unknown';
  }

  /**
   * Identify dependencies between subsystems
   */
  private identifySubsystemDependencies(): void {
    for (const subsystem of this.subsystems) {
      const internalDeps = new Set<string>();

      const fragments = subsystem.fragments
        .map((fid) => this.fragments.find((f) => f.id === fid))
        .filter((f): f is CodeFragment => f !== undefined);

      // Check if this subsystem depends on fragments from other subsystems
      for (const frag of fragments) {
        for (const dep of frag.dependencies) {
          // Find which subsystem provides this dependency
          for (const otherSub of this.subsystems) {
            if (otherSub.id === subsystem.id) continue;

            const providesThis = otherSub.primary_symbols.some((sym) => dep.includes(sym));
            if (providesThis) {
              internalDeps.add(otherSub.id);
            }
          }
        }
      }

      subsystem.internal_dependencies = Array.from(internalDeps);
    }
  }

  /**
   * Save results to disk
   */
  private async saveResults(): Promise<void> {
    await fs.mkdir(this.config.output_dir, { recursive: true });

    // Save subsystems
    const subsystemsPath = path.join(this.config.output_dir, 'subsystems.json');
    await fs.writeFile(
      subsystemsPath,
      JSON.stringify(
        {
          inferred_at: new Date().toISOString(),
          total_subsystems: this.subsystems.length,
          subsystems: this.subsystems,
        },
        null,
        2
      )
    );

    // Save co-change patterns
    const patternsPath = path.join(this.config.output_dir, 'co_change_patterns.json');
    await fs.writeFile(
      patternsPath,
      JSON.stringify(
        {
          inferred_at: new Date().toISOString(),
          total_patterns: this.coChangePatterns.length,
          patterns: this.coChangePatterns,
        },
        null,
        2
      )
    );

    console.log(`Subsystems saved to: ${subsystemsPath}`);
    console.log(`Co-change patterns saved to: ${patternsPath}`);
  }

  /**
   * Get inference statistics
   */
  getStats(): InferenceStats {
    return {
      total_subsystems: this.subsystems.length,
      avg_subsystem_size: this.calculateAvgSize(),
      avg_coherence: this.calculateAvgCoherence(),
      categories: this.countByCategory(),
      high_confidence_count: this.subsystems.filter((s) => s.confidence === 'high').length,
      co_change_patterns: this.coChangePatterns.length,
    };
  }

  private calculateAvgSize(): number {
    if (this.subsystems.length === 0) return 0;
    const sum = this.subsystems.reduce((s, sub) => s + sub.fragments.length, 0);
    return Math.round((sum / this.subsystems.length) * 10) / 10;
  }

  private calculateAvgCoherence(): number {
    if (this.subsystems.length === 0) return 0;
    const sum = this.subsystems.reduce((s, sub) => s + sub.coherence_score, 0);
    return Math.round((sum / this.subsystems.length) * 100) / 100;
  }

  private countByCategory(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const sub of this.subsystems) {
      const cat = sub.characteristics.category;
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }

  private capitalize(str: string): string {
    return str
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

interface InferenceStats {
  total_subsystems: number;
  avg_subsystem_size: number;
  avg_coherence: number;
  categories: Record<string, number>;
  high_confidence_count: number;
  co_change_patterns: number;
}
