/**
 * Template Composer - Handles template inheritance and mixins
 */

import type { PromptTemplate, TemplateVariable } from './types.js';

export class TemplateComposer {
  private registry: any; // Reference to TemplateRegistry (circular dependency)

  constructor(registry: any) {
    this.registry = registry;
  }

  /**
   * Compose a template with extends and mixins
   */
  async compose(template: PromptTemplate): Promise<PromptTemplate> {
    let composed = { ...template };

    // Apply base template if extends is specified
    if (template.extends) {
      const baseTemplate = this.registry.get(template.extends);
      if (!baseTemplate) {
        throw new Error(`Base template not found: ${template.extends}`);
      }

      // Recursively compose base template
      const composedBase = await this.compose(baseTemplate);
      composed = this.mergeTemplates(composedBase, composed);
    }

    // Apply mixins if specified
    if (template.mixins && template.mixins.length > 0) {
      for (const mixinId of template.mixins) {
        const mixin = this.registry.get(mixinId);
        if (!mixin) {
          console.warn(`Mixin template not found: ${mixinId}`);
          continue;
        }

        composed = this.applyMixin(composed, mixin);
      }
    }

    return composed;
  }

  /**
   * Merge two templates (child overrides parent)
   */
  private mergeTemplates(parent: PromptTemplate, child: PromptTemplate): PromptTemplate {
    return {
      ...parent,
      ...child,
      // Merge variables
      variables: this.mergeVariables(parent.variables || [], child.variables || []),
      // Merge tags
      tags: this.mergeTags(parent.tags || [], child.tags || []),
      // Merge metadata
      metadata: {
        ...parent.metadata,
        ...child.metadata,
      },
      // Content: child overrides unless it's empty
      content: child.content || parent.content,
    };
  }

  /**
   * Apply mixin to a template
   */
  private applyMixin(template: PromptTemplate, mixin: PromptTemplate): PromptTemplate {
    return {
      ...template,
      // Append mixin variables
      variables: this.mergeVariables(template.variables || [], mixin.variables || []),
      // Merge tags
      tags: this.mergeTags(template.tags || [], mixin.tags || []),
      // Merge metadata (template takes precedence)
      metadata: {
        ...mixin.metadata,
        ...template.metadata,
      },
      // Prepend or append mixin content (configurable via special markers)
      content: this.mergeContent(template.content, mixin.content),
    };
  }

  /**
   * Merge variable arrays (child overrides parent by name)
   */
  private mergeVariables(
    parent: TemplateVariable[],
    child: TemplateVariable[]
  ): TemplateVariable[] {
    const merged = new Map<string, TemplateVariable>();

    // Add parent variables
    for (const variable of parent) {
      merged.set(variable.name, variable);
    }

    // Override with child variables
    for (const variable of child) {
      merged.set(variable.name, variable);
    }

    return Array.from(merged.values());
  }

  /**
   * Merge tag arrays (unique union)
   */
  private mergeTags(parent: string[], child: string[]): string[] {
    return Array.from(new Set([...parent, ...child]));
  }

  /**
   * Merge content from template and mixin
   * Supports markers: <!-- MIXIN:PREPEND -->, <!-- MIXIN:APPEND -->
   */
  private mergeContent(templateContent: string, mixinContent: string): string {
    // Check for prepend marker
    if (templateContent.includes('<!-- MIXIN:PREPEND -->')) {
      return templateContent.replace('<!-- MIXIN:PREPEND -->', mixinContent);
    }

    // Check for append marker
    if (templateContent.includes('<!-- MIXIN:APPEND -->')) {
      return templateContent.replace('<!-- MIXIN:APPEND -->', mixinContent);
    }

    // Default: append mixin content
    return `${templateContent}\n\n${mixinContent}`;
  }

  /**
   * Validate template composition (detect circular dependencies)
   */
  validateComposition(template: PromptTemplate, visited: Set<string> = new Set()): void {
    if (visited.has(template.id)) {
      throw new Error(`Circular dependency detected in template: ${template.id}`);
    }

    visited.add(template.id);

    if (template.extends) {
      const baseTemplate = this.registry.get(template.extends);
      if (baseTemplate) {
        this.validateComposition(baseTemplate, visited);
      }
    }

    if (template.mixins) {
      for (const mixinId of template.mixins) {
        const mixin = this.registry.get(mixinId);
        if (mixin) {
          this.validateComposition(mixin, new Set(visited));
        }
      }
    }
  }
}
