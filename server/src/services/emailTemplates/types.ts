export interface EmailBranding {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  supportEmail?: string;
  footerText?: string;
}

export interface EmailTemplateInput {
  key: string;
  subjectTemplate: string;
  bodyTemplate: string;
  description?: string | null;
  branding?: EmailBranding | null;
}

export interface EmailTemplateRecord extends EmailTemplateInput {
  id: string;
  tenantId: string;
  description: string | null;
  branding: EmailBranding;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplateRenderOptions {
  tenantId: string;
  key: string;
  context?: Record<string, unknown>;
  brandOverrides?: EmailBranding | null;
}

export interface EmailTemplateRenderResult {
  subject: string;
  html: string;
  text: string;
  branding: EmailBranding;
}
