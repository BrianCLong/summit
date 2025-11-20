/**
 * Report Template Registry
 * Manages report templates with clear separation from report generation logic
 */

import { v4 as uuidv4 } from 'uuid';
import type { ReportTemplate, CustomTemplateRequest, TemplateExtension } from './types/Template.js';
import { TemplateValidator } from './validators/TemplateValidator.js';
import { TEMPLATE_DEFINITIONS } from './templates/template-definitions.js';

export class ReportTemplateRegistry {
  private templates: Map<string, ReportTemplate> = new Map();

  constructor() {
    this.initializeSystemTemplates();
  }

  /**
   * Initialize system-provided templates
   */
  private initializeSystemTemplates(): void {
    for (const template of TEMPLATE_DEFINITIONS) {
      this.templates.set(template.id, { ...template, type: 'SYSTEM' });
    }
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates filtered by category
   */
  getTemplatesByCategory(category: string): ReportTemplate[] {
    return Array.from(this.templates.values()).filter(
      (template) => template.category === category,
    );
  }

  /**
   * Get templates filtered by access level
   */
  getTemplatesByAccessLevel(accessLevel: string): ReportTemplate[] {
    const levelHierarchy = {
      ANALYST: 0,
      SENIOR_ANALYST: 1,
      SUPERVISOR: 2,
      SYSTEM_ADMIN: 3,
    };

    const userLevel = levelHierarchy[accessLevel as keyof typeof levelHierarchy] ?? 0;

    return Array.from(this.templates.values()).filter((template) => {
      const templateLevel =
        levelHierarchy[template.accessLevel as keyof typeof levelHierarchy] ?? 0;
      return templateLevel <= userLevel;
    });
  }

  /**
   * Create a custom template
   */
  createCustomTemplate(data: CustomTemplateRequest): ReportTemplate {
    TemplateValidator.validateCustomTemplate(data);

    const id = uuidv4();
    const template: ReportTemplate = {
      id,
      type: 'CUSTOM',
      name: data.name,
      description: data.description || '',
      category: 'INVESTIGATION', // Default category for custom templates
      sections: data.sections,
      parameters: [],
      outputFormats: data.exportFormats || ['pdf', 'docx'],
      exportFormats: data.exportFormats || ['pdf', 'docx'],
      estimatedTime: 120000, // Default 2 minutes
      accessLevel: 'ANALYST',
    };

    this.templates.set(id, template);
    return template;
  }

  /**
   * Extend an existing template with additional sections/parameters
   */
  extendTemplate(baseTemplateId: string, customization: TemplateExtension): ReportTemplate {
    const baseTemplate = this.templates.get(baseTemplateId);
    if (!baseTemplate) {
      throw new Error(`Base template not found: ${baseTemplateId}`);
    }

    const id = uuidv4();
    const extendedTemplate: ReportTemplate = {
      ...baseTemplate,
      id,
      parentTemplateId: baseTemplateId,
      type: 'CUSTOM',
      name: customization.name || baseTemplate.name,
      sections: [
        ...baseTemplate.sections,
        ...(customization.additionalSections || []),
      ],
      parameters: [
        ...baseTemplate.parameters,
        // Merge additional parameters if needed
      ],
    };

    this.templates.set(id, extendedTemplate);
    return extendedTemplate;
  }

  /**
   * Delete a custom template
   */
  deleteTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    // Cannot delete system templates
    if (template.type === 'SYSTEM') {
      throw new Error('Cannot delete system templates');
    }

    return this.templates.delete(templateId);
  }

  /**
   * Check if a template supports a specific format
   */
  supportsFormat(templateId: string, format: string): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    const normalizedFormat = format.toUpperCase();
    const supportedFormats = (template.outputFormats || template.exportFormats || []).map((f) =>
      f.toUpperCase(),
    );

    return supportedFormats.includes(normalizedFormat);
  }

  /**
   * Get template metadata
   */
  getTemplateMetadata(templateId: string) {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      type: template.type,
      sectionCount: template.sections.length,
      parameterCount: template.parameters.length,
      supportedFormats: template.outputFormats || template.exportFormats,
      estimatedTime: template.estimatedTime,
      accessLevel: template.accessLevel,
    };
  }
}
