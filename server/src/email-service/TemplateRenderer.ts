/**
 * Template Renderer
 *
 * Renders email templates using MJML and React Email
 */

import mjml2html from 'mjml';
import { render as renderReactEmail } from '@react-email/render';
import { htmlToText } from 'html-to-text';
import juice from 'juice';
import { EmailTemplate, TemplateVariable } from './types.js';

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
  previewText?: string;
}

export class TemplateRenderer {
  /**
   * Render an email template with variables
   */
  async render(
    template: EmailTemplate,
    variables: Record<string, any>,
  ): Promise<RenderedTemplate> {
    // Validate required variables
    this.validateVariables(template.variables, variables);

    // Render subject with variables
    const subject = this.interpolate(template.subject, variables);

    let html: string;

    // Render based on template type
    if (template.mjmlContent) {
      html = await this.renderMJML(template.mjmlContent, variables);
    } else if (template.reactEmailComponent) {
      html = await this.renderReactEmail(template.reactEmailComponent, variables);
    } else {
      throw new Error(`Template ${template.id} has no content to render`);
    }

    // Inline CSS for better email client compatibility
    html = juice(html);

    // Generate text version
    const text = htmlToText(html, {
      wordwrap: 130,
      preserveNewlines: true,
      selectors: [
        { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
        { selector: 'img', format: 'skip' },
      ],
    });

    return {
      subject,
      html,
      text,
      previewText: template.previewText
        ? this.interpolate(template.previewText, variables)
        : undefined,
    };
  }

  /**
   * Render MJML template
   */
  private async renderMJML(
    mjmlContent: string,
    variables: Record<string, any>,
  ): Promise<string> {
    // Interpolate variables in MJML
    const interpolatedMjml = this.interpolate(mjmlContent, variables);

    // Convert MJML to HTML
    const result = mjml2html(interpolatedMjml, {
      keepComments: false,
      beautify: false,
      minify: true,
    });

    if (result.errors.length > 0) {
      throw new Error(
        `MJML rendering errors: ${result.errors.map((e) => e.message).join(', ')}`,
      );
    }

    return result.html;
  }

  /**
   * Render React Email component
   */
  private async renderReactEmail(
    componentCode: string,
    variables: Record<string, any>,
  ): Promise<string> {
    // This is a simplified implementation
    // In production, you'd want to properly evaluate the React component
    // For now, we'll treat it as a template string
    try {
      // Note: This is a basic implementation
      // A full implementation would require dynamic component loading
      const html = renderReactEmail(componentCode as any, variables);
      return html;
    } catch (error) {
      throw new Error(
        `React Email rendering error: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Interpolate variables in template string
   */
  private interpolate(
    template: string,
    variables: Record<string, any>,
  ): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path.trim());

      if (value === undefined || value === null) {
        console.warn(`Template variable not found: ${path}`);
        return match; // Keep placeholder if value not found
      }

      // Format value based on type
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }

      if (Array.isArray(value)) {
        return value.join(', ');
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Validate that all required variables are provided
   */
  private validateVariables(
    templateVars: TemplateVariable[],
    providedVars: Record<string, any>,
  ): void {
    const missing: string[] = [];

    for (const templateVar of templateVars) {
      if (templateVar.required) {
        const value = this.getNestedValue(providedVars, templateVar.name);
        if (value === undefined || value === null) {
          // Check if there's a default value
          if (templateVar.defaultValue === undefined) {
            missing.push(templateVar.name);
          } else {
            // Set default value
            this.setNestedValue(providedVars, templateVar.name, templateVar.defaultValue);
          }
        }
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required template variables: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}
