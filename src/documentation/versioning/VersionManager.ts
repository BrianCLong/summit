/**
 * Documentation Versioning and Migration Strategies System
 *
 * Provides comprehensive version management for documentation including:
 * - Semantic versioning for documentation releases
 * - Automated content migration between versions
 * - Branch-based documentation workflows
 * - Breaking change detection and notification
 * - Deprecation tracking and management
 * - Version-aware search and navigation
 * - Content synchronization across versions
 * - API version compatibility mapping
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import semver from 'semver';

export interface VersionConfig {
  baseDirectory: string;
  versioningStrategy: 'semantic' | 'date' | 'custom';
  supportedVersions: number;
  migrationRules: MigrationRule[];
  deprecationPolicy: DeprecationPolicy;
  versionFormat: string;
  autoMigration: boolean;
  breakingChangeDetection: boolean;
}

export interface DocumentVersion {
  version: string;
  releaseDate: Date;
  status: 'draft' | 'published' | 'deprecated' | 'archived';
  changelog: ChangelogEntry[];
  apiCompatibility: { [version: string]: CompatibilityLevel };
  metadata: {
    title: string;
    description: string;
    author: string;
    tags: string[];
    branchRef?: string;
    commitHash?: string;
  };
  content: Map<string, DocumentContent>;
  migrations: MigrationResult[];
}

export interface DocumentContent {
  id: string;
  path: string;
  title: string;
  content: string;
  contentType: 'markdown' | 'html' | 'api' | 'tutorial';
  lastModified: Date;
  checksum: string;
  dependencies: string[];
  deprecations: DeprecationInfo[];
}

export interface MigrationRule {
  id: string;
  name: string;
  description: string;
  fromVersionPattern: string;
  toVersionPattern: string;
  priority: number;
  transformations: ContentTransformation[];
  validationRules: ValidationRule[];
  rollbackSupported: boolean;
}

export interface ContentTransformation {
  type: 'replace' | 'insert' | 'delete' | 'move' | 'rename';
  selector: string;
  newValue?: string;
  position?: 'before' | 'after' | 'replace';
  conditions?: { [key: string]: any };
}

export interface ChangelogEntry {
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  description: string;
  impact: 'major' | 'minor' | 'patch';
  affectedPaths: string[];
  breakingChange: boolean;
  migrationRequired: boolean;
  author: string;
  timestamp: Date;
  issueRefs?: string[];
}

export interface DeprecationPolicy {
  warningPeriod: number; // in days
  removalPeriod: number; // in days
  notificationChannels: string[];
  autoArchive: boolean;
  replacementGuidance: boolean;
}

export interface DeprecationInfo {
  deprecatedAt: Date;
  removalDate?: Date;
  reason: string;
  replacement?: string;
  migrationPath?: string;
  severity: 'warning' | 'error';
  status: 'deprecated' | 'removed';
}

export interface MigrationResult {
  ruleId: string;
  applied: boolean;
  success: boolean;
  errors: string[];
  warnings: string[];
  changesCount: number;
  rollbackData?: any;
  executionTime: number;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validator: (content: DocumentContent, context: any) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export enum CompatibilityLevel {
  FULLY_COMPATIBLE = 'fully-compatible',
  COMPATIBLE_WITH_WARNINGS = 'compatible-with-warnings',
  BREAKING_CHANGES = 'breaking-changes',
  INCOMPATIBLE = 'incompatible',
}

export class VersionManager extends EventEmitter {
  private config: VersionConfig;
  private versions: Map<string, DocumentVersion> = new Map();
  private migrationRules: Map<string, MigrationRule> = new Map();
  private currentVersion?: string;
  private lockFile: string;

  constructor(config: VersionConfig) {
    super();
    this.config = config;
    this.lockFile = path.join(config.baseDirectory, '.version-lock');

    // Load migration rules
    config.migrationRules.forEach((rule) => {
      this.migrationRules.set(rule.id, rule);
    });
  }

  /**
   * Initialize version manager
   */
  public async initialize(): Promise<void> {
    console.log('📚 Initializing version manager...');

    try {
      // Create base directory if it doesn't exist
      await fs.mkdir(this.config.baseDirectory, { recursive: true });

      // Load existing versions
      await this.loadVersions();

      // Set up version monitoring
      this.setupVersionMonitoring();

      console.log('✅ Version manager initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize version manager:', error);
      throw error;
    }
  }

  /**
   * Create a new version
   */
  public async createVersion(
    versionNumber: string,
    metadata: DocumentVersion['metadata'],
    sourceVersion?: string,
  ): Promise<DocumentVersion> {
    console.log(`📝 Creating version ${versionNumber}...`);

    // Validate version number
    if (!this.isValidVersion(versionNumber)) {
      throw new Error(`Invalid version format: ${versionNumber}`);
    }

    // Check if version already exists
    if (this.versions.has(versionNumber)) {
      throw new Error(`Version ${versionNumber} already exists`);
    }

    const version: DocumentVersion = {
      version: versionNumber,
      releaseDate: new Date(),
      status: 'draft',
      changelog: [],
      apiCompatibility: {},
      metadata,
      content: new Map(),
      migrations: [],
    };

    // Copy content from source version if specified
    if (sourceVersion) {
      await this.copyContentFromVersion(version, sourceVersion);
    }

    this.versions.set(versionNumber, version);
    await this.saveVersionMetadata(version);

    this.emit('version_created', versionNumber);
    return version;
  }

  /**
   * Publish a version
   */
  public async publishVersion(versionNumber: string): Promise<void> {
    const version = this.versions.get(versionNumber);
    if (!version) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    console.log(`🚀 Publishing version ${versionNumber}...`);

    try {
      // Run validations
      const validationResults = await this.validateVersion(version);
      if (validationResults.some((r) => !r.valid && r.errors.length > 0)) {
        throw new Error('Version validation failed');
      }

      // Generate changelog
      await this.generateChangelog(version);

      // Apply deprecation policy
      await this.applyDeprecationPolicy(version);

      // Update version status
      version.status = 'published';
      version.releaseDate = new Date();

      // Set as current version if it's the latest
      if (this.isLatestVersion(versionNumber)) {
        this.currentVersion = versionNumber;
      }

      await this.saveVersionMetadata(version);
      this.emit('version_published', versionNumber);
    } catch (error) {
      console.error(`❌ Failed to publish version ${versionNumber}:`, error);
      throw error;
    }
  }

  /**
   * Migrate content between versions
   */
  public async migrateContent(
    fromVersion: string,
    toVersion: string,
    contentPaths?: string[],
  ): Promise<MigrationResult[]> {
    console.log(`🔄 Migrating content from ${fromVersion} to ${toVersion}...`);

    const sourceVersion = this.versions.get(fromVersion);
    const targetVersion = this.versions.get(toVersion);

    if (!sourceVersion || !targetVersion) {
      throw new Error('Source or target version not found');
    }

    const results: MigrationResult[] = [];

    // Find applicable migration rules
    const applicableRules = this.findMigrationRules(fromVersion, toVersion);

    for (const rule of applicableRules) {
      const result = await this.applyMigrationRule(
        rule,
        sourceVersion,
        targetVersion,
        contentPaths,
      );
      results.push(result);
      targetVersion.migrations.push(result);
    }

    await this.saveVersionMetadata(targetVersion);
    this.emit('content_migrated', fromVersion, toVersion, results);

    return results;
  }

  /**
   * Detect breaking changes between versions
   */
  public async detectBreakingChanges(
    fromVersion: string,
    toVersion: string,
  ): Promise<BreakingChange[]> {
    const source = this.versions.get(fromVersion);
    const target = this.versions.get(toVersion);

    if (!source || !target) {
      throw new Error('Version not found');
    }

    const breakingChanges: BreakingChange[] = [];

    // Compare API changes
    const apiChanges = await this.compareAPIVersions(source, target);
    breakingChanges.push(...apiChanges);

    // Compare content structure changes
    const structureChanges = await this.compareContentStructure(source, target);
    breakingChanges.push(...structureChanges);

    // Compare dependency changes
    const dependencyChanges = await this.compareDependencies(source, target);
    breakingChanges.push(...dependencyChanges);

    return breakingChanges;
  }

  /**
   * Get version compatibility matrix
   */
  public getCompatibilityMatrix(): {
    [fromVersion: string]: { [toVersion: string]: CompatibilityLevel };
  } {
    const matrix: {
      [fromVersion: string]: { [toVersion: string]: CompatibilityLevel };
    } = {};

    for (const [versionA] of this.versions) {
      matrix[versionA] = {};
      for (const [versionB, versionDataB] of this.versions) {
        if (versionA === versionB) {
          matrix[versionA][versionB] = CompatibilityLevel.FULLY_COMPATIBLE;
        } else {
          matrix[versionA][versionB] =
            versionDataB.apiCompatibility[versionA] ||
            this.calculateCompatibility(versionA, versionB);
        }
      }
    }

    return matrix;
  }

  /**
   * Archive old versions
   */
  public async archiveOldVersions(): Promise<string[]> {
    console.log('🗄️ Archiving old versions...');

    const archivedVersions: string[] = [];
    const sortedVersions = this.getSortedVersions();
    const versionsToKeep = this.config.supportedVersions;

    if (sortedVersions.length <= versionsToKeep) {
      return archivedVersions;
    }

    const versionsToArchive = sortedVersions.slice(0, -versionsToKeep);

    for (const versionNumber of versionsToArchive) {
      const version = this.versions.get(versionNumber)!;
      if (version.status !== 'archived') {
        version.status = 'archived';
        await this.saveVersionMetadata(version);
        archivedVersions.push(versionNumber);
      }
    }

    this.emit('versions_archived', archivedVersions);
    return archivedVersions;
  }

  /**
   * Get version history
   */
  public getVersionHistory(): VersionHistoryEntry[] {
    return this.getSortedVersions().map((versionNumber) => {
      const version = this.versions.get(versionNumber)!;
      return {
        version: versionNumber,
        releaseDate: version.releaseDate,
        status: version.status,
        changelogSummary: this.summarizeChangelog(version.changelog),
        breakingChanges: version.changelog.filter(
          (entry) => entry.breakingChange,
        ).length,
        migrationsApplied: version.migrations.length,
      };
    });
  }

  /**
   * Rollback migration
   */
  public async rollbackMigration(
    versionNumber: string,
    migrationId: string,
  ): Promise<boolean> {
    const version = this.versions.get(versionNumber);
    if (!version) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    const migration = version.migrations.find((m) => m.ruleId === migrationId);
    if (!migration || !migration.rollbackData) {
      throw new Error('Migration not found or rollback not supported');
    }

    try {
      await this.performRollback(version, migration);

      // Remove migration from history
      version.migrations = version.migrations.filter(
        (m) => m.ruleId !== migrationId,
      );

      await this.saveVersionMetadata(version);
      this.emit('migration_rolled_back', versionNumber, migrationId);

      return true;
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      return false;
    }
  }

  // Private methods
  private async loadVersions(): Promise<void> {
    try {
      const versionDirs = await fs.readdir(this.config.baseDirectory, {
        withFileTypes: true,
      });

      for (const dir of versionDirs) {
        if (dir.isDirectory() && this.isValidVersion(dir.name)) {
          const versionPath = path.join(this.config.baseDirectory, dir.name);
          const metadataPath = path.join(versionPath, 'metadata.json');

          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const version: DocumentVersion = JSON.parse(metadataContent);

            // Load content
            await this.loadVersionContent(version, versionPath);

            this.versions.set(version.version, version);
          } catch (error) {
            console.warn(
              `⚠️ Failed to load version ${dir.name}:`,
              error.message,
            );
          }
        }
      }

      // Set current version
      const sortedVersions = this.getSortedVersions();
      if (sortedVersions.length > 0) {
        this.currentVersion = sortedVersions[sortedVersions.length - 1];
      }
    } catch (error) {
      console.warn('⚠️ No existing versions found');
    }
  }

  private async loadVersionContent(
    version: DocumentVersion,
    versionPath: string,
  ): Promise<void> {
    const contentDir = path.join(versionPath, 'content');

    try {
      const contentFiles = await this.getAllFiles(contentDir);

      for (const filePath of contentFiles) {
        const relativePath = path.relative(contentDir, filePath);
        const content = await fs.readFile(filePath, 'utf8');
        const stats = await fs.stat(filePath);

        const documentContent: DocumentContent = {
          id: this.generateContentId(relativePath),
          path: relativePath,
          title: this.extractTitle(content),
          content,
          contentType: this.determineContentType(filePath),
          lastModified: stats.mtime,
          checksum: this.calculateChecksum(content),
          dependencies: this.extractDependencies(content),
          deprecations: this.extractDeprecations(content),
        };

        version.content.set(relativePath, documentContent);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load content for version ${version.version}`);
    }
  }

  private async saveVersionMetadata(version: DocumentVersion): Promise<void> {
    const versionDir = path.join(this.config.baseDirectory, version.version);
    const metadataPath = path.join(versionDir, 'metadata.json');

    await fs.mkdir(versionDir, { recursive: true });

    // Convert Map to Object for JSON serialization
    const serializable = {
      ...version,
      content: Object.fromEntries(version.content),
    };

    await fs.writeFile(
      metadataPath,
      JSON.stringify(serializable, null, 2),
      'utf8',
    );
  }

  private isValidVersion(version: string): boolean {
    switch (this.config.versioningStrategy) {
      case 'semantic':
        return semver.valid(version) !== null;
      case 'date':
        return /^\d{4}-\d{2}-\d{2}$/.test(version);
      case 'custom':
        return new RegExp(this.config.versionFormat).test(version);
      default:
        return true;
    }
  }

  private getSortedVersions(): string[] {
    const versions = Array.from(this.versions.keys());

    switch (this.config.versioningStrategy) {
      case 'semantic':
        return versions.sort(semver.compare);
      case 'date':
        return versions.sort();
      default:
        return versions.sort();
    }
  }

  private isLatestVersion(versionNumber: string): boolean {
    const sorted = this.getSortedVersions();
    return sorted[sorted.length - 1] === versionNumber;
  }

  private async copyContentFromVersion(
    targetVersion: DocumentVersion,
    sourceVersionNumber: string,
  ): Promise<void> {
    const sourceVersion = this.versions.get(sourceVersionNumber);
    if (!sourceVersion) {
      throw new Error(`Source version ${sourceVersionNumber} not found`);
    }

    for (const [path, content] of sourceVersion.content) {
      targetVersion.content.set(path, { ...content });
    }
  }

  private findMigrationRules(
    fromVersion: string,
    toVersion: string,
  ): MigrationRule[] {
    return Array.from(this.migrationRules.values())
      .filter((rule) => {
        const fromMatch = new RegExp(rule.fromVersionPattern).test(fromVersion);
        const toMatch = new RegExp(rule.toVersionPattern).test(toVersion);
        return fromMatch && toMatch;
      })
      .sort((a, b) => b.priority - a.priority);
  }

  private async applyMigrationRule(
    rule: MigrationRule,
    sourceVersion: DocumentVersion,
    targetVersion: DocumentVersion,
    contentPaths?: string[],
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      ruleId: rule.id,
      applied: false,
      success: false,
      errors: [],
      warnings: [],
      changesCount: 0,
      executionTime: 0,
    };

    try {
      const contentToProcess = contentPaths
        ? Array.from(targetVersion.content.entries()).filter(([path]) =>
            contentPaths.includes(path),
          )
        : Array.from(targetVersion.content.entries());

      for (const [path, content] of contentToProcess) {
        const transformResult = await this.applyTransformations(
          content,
          rule.transformations,
        );

        if (transformResult.changed) {
          result.changesCount++;
          targetVersion.content.set(path, transformResult.content);
        }

        result.warnings.push(...transformResult.warnings);
      }

      // Run validation rules
      for (const validationRule of rule.validationRules) {
        for (const [, content] of contentToProcess) {
          const validationResult = validationRule.validator(content, {
            sourceVersion,
            targetVersion,
          });

          if (!validationResult.valid) {
            if (validationRule.severity === 'error') {
              result.errors.push(...validationResult.errors);
            } else {
              result.warnings.push(...validationResult.warnings);
            }
          }
        }
      }

      result.applied = true;
      result.success = result.errors.length === 0;
      result.executionTime = Date.now() - startTime;
    } catch (error) {
      result.errors.push(`Migration rule execution failed: ${error.message}`);
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  private async applyTransformations(
    content: DocumentContent,
    transformations: ContentTransformation[],
  ): Promise<{
    content: DocumentContent;
    changed: boolean;
    warnings: string[];
  }> {
    let contentText = content.content;
    let changed = false;
    const warnings: string[] = [];

    for (const transformation of transformations) {
      try {
        const result = this.applyTransformation(contentText, transformation);
        if (result.changed) {
          contentText = result.content;
          changed = true;
        }
        warnings.push(...result.warnings);
      } catch (error) {
        warnings.push(`Transformation failed: ${error.message}`);
      }
    }

    const updatedContent = {
      ...content,
      content: contentText,
      lastModified: new Date(),
      checksum: this.calculateChecksum(contentText),
    };

    return { content: updatedContent, changed, warnings };
  }

  private applyTransformation(
    content: string,
    transformation: ContentTransformation,
  ): { content: string; changed: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let result = content;
    let changed = false;

    try {
      switch (transformation.type) {
        case 'replace':
          const regex = new RegExp(transformation.selector, 'g');
          const newResult = result.replace(
            regex,
            transformation.newValue || '',
          );
          changed = newResult !== result;
          result = newResult;
          break;

        case 'insert':
          // Implementation for insert transformation
          break;

        case 'delete':
          const deleteRegex = new RegExp(transformation.selector, 'g');
          const deletedResult = result.replace(deleteRegex, '');
          changed = deletedResult !== result;
          result = deletedResult;
          break;

        default:
          warnings.push(
            `Unsupported transformation type: ${transformation.type}`,
          );
      }
    } catch (error) {
      warnings.push(`Transformation error: ${error.message}`);
    }

    return { content: result, changed, warnings };
  }

  private setupVersionMonitoring(): void {
    // Set up file system watching for version changes
    // Implementation would depend on the specific requirements
  }

  private async validateVersion(
    version: DocumentVersion,
  ): Promise<ValidationResult[]> {
    // Implementation for version validation
    return [];
  }

  private async generateChangelog(version: DocumentVersion): Promise<void> {
    // Implementation for changelog generation
  }

  private async applyDeprecationPolicy(
    version: DocumentVersion,
  ): Promise<void> {
    // Implementation for deprecation policy application
  }

  private calculateCompatibility(
    versionA: string,
    versionB: string,
  ): CompatibilityLevel {
    // Implementation for compatibility calculation
    return CompatibilityLevel.COMPATIBLE_WITH_WARNINGS;
  }

  private async compareAPIVersions(
    source: DocumentVersion,
    target: DocumentVersion,
  ): Promise<BreakingChange[]> {
    // Implementation for API comparison
    return [];
  }

  private async compareContentStructure(
    source: DocumentVersion,
    target: DocumentVersion,
  ): Promise<BreakingChange[]> {
    // Implementation for content structure comparison
    return [];
  }

  private async compareDependencies(
    source: DocumentVersion,
    target: DocumentVersion,
  ): Promise<BreakingChange[]> {
    // Implementation for dependency comparison
    return [];
  }

  private summarizeChangelog(changelog: ChangelogEntry[]): string {
    const counts = changelog.reduce(
      (acc, entry) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number },
    );

    return Object.entries(counts)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
  }

  private async performRollback(
    version: DocumentVersion,
    migration: MigrationResult,
  ): Promise<void> {
    // Implementation for migration rollback
  }

  // Helper methods
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.getAllFiles(fullPath)));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private generateContentId(path: string): string {
    return Buffer.from(path)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  private extractTitle(content: string): string {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1] : 'Untitled';
  }

  private determineContentType(
    filePath: string,
  ): DocumentContent['contentType'] {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.md':
        return 'markdown';
      case '.html':
        return 'html';
      default:
        return 'markdown';
    }
  }

  private calculateChecksum(content: string): string {
    // Simple checksum calculation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private extractDependencies(content: string): string[] {
    // Extract dependencies from content (links, imports, etc.)
    const dependencies: string[] = [];
    const linkRegex = /\[.*?\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  private extractDeprecations(content: string): DeprecationInfo[] {
    // Extract deprecation notices from content
    const deprecations: DeprecationInfo[] = [];
    const deprecationRegex = /<!-- DEPRECATED: (.*?) -->/g;
    let match;

    while ((match = deprecationRegex.exec(content)) !== null) {
      deprecations.push({
        deprecatedAt: new Date(),
        reason: match[1],
        severity: 'warning',
        status: 'deprecated',
      });
    }

    return deprecations;
  }
}

// Supporting interfaces
interface BreakingChange {
  type: 'api' | 'structure' | 'dependency';
  description: string;
  path: string;
  severity: 'major' | 'minor';
  migrationRequired: boolean;
  automatedMigration: boolean;
}

interface VersionHistoryEntry {
  version: string;
  releaseDate: Date;
  status: DocumentVersion['status'];
  changelogSummary: string;
  breakingChanges: number;
  migrationsApplied: number;
}
