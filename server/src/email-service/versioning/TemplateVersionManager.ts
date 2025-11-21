/**
 * Template Version Manager
 *
 * Manages email template versions with rollback capability
 */

import {
  EmailTemplate,
  TemplateVersion,
  EmailTemplateCategory,
} from '../types.js';

export class TemplateVersionManager {
  private templates: Map<string, EmailTemplate> = new Map();
  private versions: Map<string, TemplateVersion[]> = new Map();

  async initialize(): Promise<void> {
    // Load templates from database (placeholder)
  }

  /**
   * Get active template by ID
   */
  async getActiveTemplate(templateId: string): Promise<EmailTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    if (!template.active) {
      throw new Error(`Template is not active: ${templateId}`);
    }
    return template;
  }

  /**
   * Get template variant
   */
  async getTemplateVariant(
    templateId: string,
    variantId: string,
  ): Promise<EmailTemplate> {
    const template = await this.getActiveTemplate(templateId);
    const variant = template.variants?.find((v) => v.id === variantId);

    if (!variant) {
      throw new Error(`Variant not found: ${variantId}`);
    }

    // Create a copy of the template with the variant content
    return {
      ...template,
      subject: variant.subject || template.subject,
      mjmlContent: variant.mjmlContent || template.mjmlContent,
      reactEmailComponent: variant.reactEmailComponent || template.reactEmailComponent,
    };
  }

  /**
   * Save template (creates new version)
   */
  async saveTemplate(template: EmailTemplate): Promise<TemplateVersion> {
    // Generate new version number
    const existingVersions = this.versions.get(template.id) || [];
    const versionNumber = this.generateVersionNumber(existingVersions);

    // Create version snapshot
    const version: TemplateVersion = {
      id: `${template.id}-v${versionNumber}`,
      templateId: template.id,
      version: versionNumber,
      createdAt: new Date(),
      createdBy: 'system', // Should come from auth context
      subject: template.subject,
      mjmlContent: template.mjmlContent,
      reactEmailComponent: template.reactEmailComponent,
      variables: template.variables,
      changeLog: `Version ${versionNumber} created`,
      tags: template.tags,
      active: true,
      deprecated: false,
    };

    // Save version
    existingVersions.push(version);
    this.versions.set(template.id, existingVersions);

    // Update template
    template.version = versionNumber;
    template.updatedAt = new Date();
    this.templates.set(template.id, template);

    return version;
  }

  /**
   * Get all versions of a template
   */
  async getVersions(templateId: string): Promise<TemplateVersion[]> {
    return this.versions.get(templateId) || [];
  }

  /**
   * Get specific version
   */
  async getVersion(templateId: string, version: string): Promise<TemplateVersion | null> {
    const versions = this.versions.get(templateId) || [];
    return versions.find((v) => v.version === version) || null;
  }

  /**
   * Rollback to previous version
   */
  async rollback(templateId: string, targetVersion: string): Promise<EmailTemplate> {
    const version = await this.getVersion(templateId, targetVersion);
    if (!version) {
      throw new Error(`Version not found: ${targetVersion}`);
    }

    const currentTemplate = this.templates.get(templateId);
    if (!currentTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Create template from version
    const rolledBackTemplate: EmailTemplate = {
      ...currentTemplate,
      subject: version.subject,
      mjmlContent: version.mjmlContent,
      reactEmailComponent: version.reactEmailComponent,
      variables: version.variables,
      tags: version.tags,
      version: targetVersion,
      updatedAt: new Date(),
    };

    // Save as new version
    await this.saveTemplate(rolledBackTemplate);

    return rolledBackTemplate;
  }

  /**
   * Deprecate a version
   */
  async deprecateVersion(
    templateId: string,
    version: string,
    reason: string,
  ): Promise<void> {
    const versions = this.versions.get(templateId) || [];
    const targetVersion = versions.find((v) => v.version === version);

    if (targetVersion) {
      targetVersion.deprecated = true;
      targetVersion.deprecatedAt = new Date();
      targetVersion.deprecationReason = reason;
    }
  }

  /**
   * List all templates
   */
  async listTemplates(options?: {
    category?: EmailTemplateCategory;
    active?: boolean;
  }): Promise<EmailTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (options?.category) {
      templates = templates.filter((t) => t.category === options.category);
    }

    if (options?.active !== undefined) {
      templates = templates.filter((t) => t.active === options.active);
    }

    return templates;
  }

  /**
   * Activate template
   */
  async activate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (template) {
      template.active = true;
      template.updatedAt = new Date();
    }
  }

  /**
   * Deactivate template
   */
  async deactivate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (template) {
      template.active = false;
      template.updatedAt = new Date();
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    templateId: string,
    version1: string,
    version2: string,
  ): Promise<{
    differences: {
      field: string;
      version1Value: any;
      version2Value: any;
    }[];
  }> {
    const v1 = await this.getVersion(templateId, version1);
    const v2 = await this.getVersion(templateId, version2);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    const differences: any[] = [];

    if (v1.subject !== v2.subject) {
      differences.push({
        field: 'subject',
        version1Value: v1.subject,
        version2Value: v2.subject,
      });
    }

    if (v1.mjmlContent !== v2.mjmlContent) {
      differences.push({
        field: 'mjmlContent',
        version1Value: v1.mjmlContent,
        version2Value: v2.mjmlContent,
      });
    }

    return { differences };
  }

  private generateVersionNumber(existingVersions: TemplateVersion[]): string {
    if (existingVersions.length === 0) {
      return '1.0.0';
    }

    const latestVersion = existingVersions[existingVersions.length - 1].version;
    const [major, minor, patch] = latestVersion.split('.').map(Number);

    // Increment patch version
    return `${major}.${minor}.${patch + 1}`;
  }
}
