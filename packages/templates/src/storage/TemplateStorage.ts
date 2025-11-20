/**
 * Template storage and versioning
 */

import { v4 as uuidv4 } from 'uuid';
import type { Template } from '../manager/TemplateManager.js';

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  content: string;
  changes: string;
  createdAt: Date;
  createdBy: string;
  snapshot: Template;
}

export interface TemplateMetadata {
  templateId: string;
  totalVersions: number;
  latestVersion: string;
  downloads: number;
  stars: number;
  forks: number;
  categories: string[];
  compatibleFormats: string[];
}

export class TemplateStorage {
  private versions: Map<string, TemplateVersion[]> = new Map();
  private metadata: Map<string, TemplateMetadata> = new Map();

  /**
   * Save template version
   */
  saveVersion(
    template: Template,
    changes: string,
    userId: string
  ): TemplateVersion {
    const version: TemplateVersion = {
      id: uuidv4(),
      templateId: template.id,
      version: template.version,
      content: template.content,
      changes,
      createdAt: new Date(),
      createdBy: userId,
      snapshot: { ...template }
    };

    const versions = this.versions.get(template.id) || [];
    versions.push(version);
    this.versions.set(template.id, versions);

    // Update metadata
    this.updateMetadata(template.id);

    return version;
  }

  /**
   * Get template versions
   */
  getVersions(templateId: string): TemplateVersion[] {
    return this.versions.get(templateId) || [];
  }

  /**
   * Get specific version
   */
  getVersion(templateId: string, version: string): TemplateVersion | undefined {
    const versions = this.versions.get(templateId) || [];
    return versions.find(v => v.version === version);
  }

  /**
   * Restore template to a specific version
   */
  restoreVersion(templateId: string, version: string): Template {
    const versionData = this.getVersion(templateId, version);
    if (!versionData) {
      throw new Error(`Version not found: ${version}`);
    }

    return versionData.snapshot;
  }

  /**
   * Get version history
   */
  getVersionHistory(templateId: string): Array<{
    version: string;
    changes: string;
    date: Date;
    author: string;
  }> {
    const versions = this.versions.get(templateId) || [];
    return versions.map(v => ({
      version: v.version,
      changes: v.changes,
      date: v.createdAt,
      author: v.createdBy
    }));
  }

  /**
   * Compare two versions
   */
  compareVersions(
    templateId: string,
    version1: string,
    version2: string
  ): {
    added: string[];
    removed: string[];
    modified: string[];
  } {
    const v1 = this.getVersion(templateId, version1);
    const v2 = this.getVersion(templateId, version2);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    // Simple comparison (in production, use a proper diff library)
    const changes = {
      added: [] as string[],
      removed: [] as string[],
      modified: [] as string[]
    };

    // Compare sections
    const v1Sections = new Set(v1.snapshot.sections.map(s => s.id));
    const v2Sections = new Set(v2.snapshot.sections.map(s => s.id));

    for (const section of v2.snapshot.sections) {
      if (!v1Sections.has(section.id)) {
        changes.added.push(`Section: ${section.name}`);
      }
    }

    for (const section of v1.snapshot.sections) {
      if (!v2Sections.has(section.id)) {
        changes.removed.push(`Section: ${section.name}`);
      }
    }

    return changes;
  }

  /**
   * Update template metadata
   */
  private updateMetadata(templateId: string): void {
    const versions = this.versions.get(templateId) || [];
    const latest = versions[versions.length - 1];

    const metadata: TemplateMetadata = this.metadata.get(templateId) || {
      templateId,
      totalVersions: 0,
      latestVersion: '1.0.0',
      downloads: 0,
      stars: 0,
      forks: 0,
      categories: [],
      compatibleFormats: []
    };

    metadata.totalVersions = versions.length;
    metadata.latestVersion = latest?.version || '1.0.0';

    this.metadata.set(templateId, metadata);
  }

  /**
   * Get template metadata
   */
  getMetadata(templateId: string): TemplateMetadata | undefined {
    return this.metadata.get(templateId);
  }

  /**
   * Track template download
   */
  trackDownload(templateId: string): void {
    const metadata = this.metadata.get(templateId);
    if (metadata) {
      metadata.downloads++;
    }
  }

  /**
   * Star template
   */
  starTemplate(templateId: string): void {
    const metadata = this.metadata.get(templateId);
    if (metadata) {
      metadata.stars++;
    }
  }

  /**
   * Fork template
   */
  forkTemplate(templateId: string): void {
    const metadata = this.metadata.get(templateId);
    if (metadata) {
      metadata.forks++;
    }
  }

  /**
   * Export template with all versions
   */
  exportTemplate(templateId: string): {
    metadata: TemplateMetadata;
    versions: TemplateVersion[];
  } {
    const metadata = this.metadata.get(templateId);
    const versions = this.versions.get(templateId) || [];

    if (!metadata) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return { metadata, versions };
  }

  /**
   * Import template with versions
   */
  importTemplate(data: {
    metadata: TemplateMetadata;
    versions: TemplateVersion[];
  }): void {
    this.metadata.set(data.metadata.templateId, data.metadata);
    this.versions.set(data.metadata.templateId, data.versions);
  }
}
