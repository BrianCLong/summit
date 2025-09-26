import { emailTemplateService } from '../../services/emailTemplates';
import { EmailBranding, EmailTemplateRecord } from '../../services/emailTemplates/types';

function getUserTenant(ctx: any): string | undefined {
  return ctx?.user?.tenantId || ctx?.user?.tenant || ctx?.user?.tenant_id;
}

function getUserRole(ctx: any): string | undefined {
  const role = ctx?.user?.role || ctx?.user?.roleId;
  return typeof role === 'string' ? role.toUpperCase() : undefined;
}

function assertTenantAccess(ctx: any, tenantId: string): void {
  const role = getUserRole(ctx);
  const tenant = getUserTenant(ctx);
  if (!ctx?.user) {
    throw new Error('unauthenticated');
  }

  if (tenant === tenantId) {
    return;
  }

  if (role && ['ADMIN', 'OPERATOR', 'SUPERADMIN'].includes(role)) {
    return;
  }

  throw new Error('forbidden');
}

function toGraphBranding(branding: EmailBranding = {}): Record<string, string | null> {
  return {
    companyName: branding.companyName ?? null,
    logoUrl: branding.logoUrl ?? null,
    primaryColor: branding.primaryColor ?? null,
    accentColor: branding.accentColor ?? null,
    supportEmail: branding.supportEmail ?? null,
    footerText: branding.footerText ?? null,
  };
}

function toGraphTemplate(template: EmailTemplateRecord) {
  return {
    id: template.id,
    tenantId: template.tenantId,
    key: template.key,
    subjectTemplate: template.subjectTemplate,
    bodyTemplate: template.bodyTemplate,
    description: template.description ?? null,
    branding: toGraphBranding(template.branding),
    createdAt: template.createdAt instanceof Date ? template.createdAt.toISOString() : new Date(template.createdAt).toISOString(),
    updatedAt: template.updatedAt instanceof Date ? template.updatedAt.toISOString() : new Date(template.updatedAt).toISOString(),
  };
}

export const emailTemplateResolvers = {
  Query: {
    async emailTemplates(_: unknown, args: { tenantId: string; key?: string | null }, ctx: any) {
      assertTenantAccess(ctx, args.tenantId);
      const templates = await emailTemplateService.listTemplates(args.tenantId, args.key ?? undefined);
      return templates.map(toGraphTemplate);
    },
    async emailTemplate(_: unknown, args: { tenantId: string; key: string }, ctx: any) {
      assertTenantAccess(ctx, args.tenantId);
      const template = await emailTemplateService.getTemplate(args.tenantId, args.key);
      return template ? toGraphTemplate(template) : null;
    },
  },
  Mutation: {
    async upsertEmailTemplate(
      _: unknown,
      args: { tenantId: string; input: { key: string; subjectTemplate: string; bodyTemplate: string; description?: string | null; branding?: EmailBranding | null } },
      ctx: any,
    ) {
      assertTenantAccess(ctx, args.tenantId);
      const saved = await emailTemplateService.upsertTemplate(args.tenantId, {
        key: args.input.key,
        subjectTemplate: args.input.subjectTemplate,
        bodyTemplate: args.input.bodyTemplate,
        description: args.input.description ?? null,
        branding: args.input.branding ?? undefined,
      });
      return toGraphTemplate(saved);
    },
    async deleteEmailTemplate(_: unknown, args: { tenantId: string; key: string }, ctx: any) {
      assertTenantAccess(ctx, args.tenantId);
      return emailTemplateService.deleteTemplate(args.tenantId, args.key);
    },
    async renderEmailTemplate(
      _: unknown,
      args: {
        tenantId: string;
        key: string;
        input: { context: Record<string, unknown>; brandOverrides?: EmailBranding | null };
      },
      ctx: any,
    ) {
      assertTenantAccess(ctx, args.tenantId);
      const rendered = await emailTemplateService.renderTemplate({
        tenantId: args.tenantId,
        key: args.key,
        context: args.input?.context ?? {},
        brandOverrides: args.input?.brandOverrides ?? undefined,
      });
      return {
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        branding: toGraphBranding(rendered.branding),
      };
    },
  },
};

export default emailTemplateResolvers;
