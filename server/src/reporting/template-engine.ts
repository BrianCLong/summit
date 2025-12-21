import nunjucks from 'nunjucks';
import { ReportContext, ReportRenderResult, ReportTemplate } from './types';

const env = new nunjucks.Environment(undefined, {
  autoescape: false,
  trimBlocks: true,
  lstripBlocks: true,
});

env.addFilter('as_date', (value: unknown) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : (value as Date);
  return date.toISOString();
});

env.addFilter('uppercase', (value: unknown) =>
  typeof value === 'string' ? value.toUpperCase() : value,
);

env.addFilter('truncate', (value: unknown, length: number) => {
  if (typeof value !== 'string') return value;
  if (value.length <= length) return value;
  return `${value.substring(0, length)}…`;
});

export class TemplateEngine {
  constructor(private readonly environment: nunjucks.Environment = env) {}

  render(template: ReportTemplate, context: ReportContext): ReportRenderResult {
    const rendered = this.environment.renderString(template.content, context);
    return { rendered, context };
  }
}

export const defaultTemplateEngine = new TemplateEngine();
