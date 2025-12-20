import _ from 'lodash';
import pino from 'pino';

const logger = pino({ name: 'TemplateEngine' });

export class TemplateEngine {
  private templates: Map<string, string> = new Map();

  constructor() {
    // Load default templates
    this.templates.set('welcome', 'Welcome to Summit, <%= name %>!');
    this.templates.set('alert', '[<%= priority %>] Alert: <%= message %>');
    this.templates.set('system_update', 'System Update: <%= details %>');
  }

  registerTemplate(id: string, template: string) {
    this.templates.set(id, template);
  }

  render(templateId: string, data: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      logger.warn({ templateId }, 'Template not found');
      return '';
    }

    try {
      const compiled = _.template(template);
      return compiled(data);
    } catch (error) {
      logger.error({ templateId, error }, 'Error rendering template');
      return template; // Return raw template on error? Or empty string?
    }
  }
}
