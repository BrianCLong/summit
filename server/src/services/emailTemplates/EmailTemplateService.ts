import { createRequire } from 'module';
import baseLogger from '../../config/logger';
import { emailTemplateRepository, EmailTemplateRepository } from '../../db/repositories/emailTemplates';
import {
  EmailBranding,
  EmailTemplateInput,
  EmailTemplateRecord,
  EmailTemplateRenderOptions,
  EmailTemplateRenderResult,
} from './types';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const handlebarsModule = require('../../vendor/handlebars.cjs');
const HandlebarsLib = handlebarsModule?.default ?? handlebarsModule;

type TemplateDelegate = (context: Record<string, any>) => string;

interface CachedTemplate {
  template: TemplateDelegate;
  source: string;
}

export class EmailTemplateService {
  private readonly logger = baseLogger.child({ name: 'email-template-service' });

  private readonly handlebars: any;

  private readonly subjectCache = new Map<string, CachedTemplate>();

  private readonly bodyCache = new Map<string, CachedTemplate>();

  constructor(
    private readonly repository: EmailTemplateRepository = emailTemplateRepository,
    handlebarsInstance?: any,
  ) {
    this.handlebars = handlebarsInstance ?? (typeof HandlebarsLib?.create === 'function' ? HandlebarsLib.create() : HandlebarsLib);
  }

  async listTemplates(tenantId: string, key?: string): Promise<EmailTemplateRecord[]> {
    return this.repository.list(tenantId, key);
  }

  async getTemplate(tenantId: string, key: string): Promise<EmailTemplateRecord | null> {
    return this.repository.findByKey(tenantId, key);
  }

  async upsertTemplate(tenantId: string, input: EmailTemplateInput): Promise<EmailTemplateRecord> {
    const saved = await this.repository.upsert(tenantId, input);
    this.invalidateCache(tenantId, input.key);
    return saved;
  }

  async deleteTemplate(tenantId: string, key: string): Promise<boolean> {
    const deleted = await this.repository.delete(tenantId, key);
    if (deleted) {
      this.invalidateCache(tenantId, key);
    }
    return deleted;
  }

  async renderTemplate(options: EmailTemplateRenderOptions): Promise<EmailTemplateRenderResult> {
    const { tenantId, key } = options;
    const template = await this.repository.findByKey(tenantId, key);

    if (!template) {
      this.logger.warn({ tenantId, key }, 'email template not found');
      throw new Error(`Email template '${key}' not found for tenant '${tenantId}'.`);
    }

    const branding = this.mergeBranding(template.branding, options.brandOverrides ?? {});
    const renderContext = {
      ...(options.context ?? {}),
      brand: branding,
      tenantId,
      templateKey: key,
    };

    const subjectDelegate = this.getCompiledTemplate(
      this.subjectCache,
      this.getCacheKey(tenantId, key, 'subject'),
      template.subjectTemplate,
    );
    const bodyDelegate = this.getCompiledTemplate(
      this.bodyCache,
      this.getCacheKey(tenantId, key, 'body'),
      template.bodyTemplate,
    );

    const subject = subjectDelegate(renderContext);
    const html = bodyDelegate(renderContext);
    const text = this.toPlainText(html);

    return { subject, html, text, branding };
  }

  clearCache(): void {
    this.subjectCache.clear();
    this.bodyCache.clear();
  }

  private invalidateCache(tenantId: string, key: string): void {
    this.subjectCache.delete(this.getCacheKey(tenantId, key, 'subject'));
    this.bodyCache.delete(this.getCacheKey(tenantId, key, 'body'));
  }

  private getCompiledTemplate(cache: Map<string, CachedTemplate>, key: string, source: string): TemplateDelegate {
    const cached = cache.get(key);
    if (cached && cached.source === source) {
      return cached.template;
    }

    const compiled = this.handlebars.compile(source);
    cache.set(key, { template: compiled, source });
    return compiled;
  }

  private getCacheKey(tenantId: string, key: string, type: 'subject' | 'body'): string {
    return `${tenantId}:${key}:${type}`;
  }

  private mergeBranding(base: EmailBranding = {}, overrides: EmailBranding = {}): EmailBranding {
    const merged: EmailBranding = { ...base, ...overrides };
    const entries = Object.entries(merged).filter(([, value]) => value !== undefined && value !== null);
    return Object.fromEntries(entries) as EmailBranding;
  }

  private toPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const emailTemplateService = new EmailTemplateService();
