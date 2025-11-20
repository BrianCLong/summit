/**
 * Report template type definitions
 */

import type { AccessLevel, ReportParameter, ReportFormat } from './Report.js';

export type TemplateCategory = 'INVESTIGATION' | 'ENTITY' | 'ANALYSIS' | 'COMPLIANCE' | 'SECURITY' | 'ANALYTICS' | 'DASHBOARD';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  type?: 'SYSTEM' | 'CUSTOM';
  sections: string[];
  parameters: ReportParameter[];
  outputFormats: string[];
  exportFormats?: string[];
  estimatedTime: number;
  accessLevel: AccessLevel;
  parentTemplateId?: string;
}

export interface CustomTemplateRequest {
  name: string;
  description?: string;
  sections: string[];
  parameters?: Record<string, any>;
  exportFormats?: string[];
  userId?: string;
}

export interface TemplateExtension {
  name?: string;
  additionalSections?: string[];
  parameters?: Record<string, any>;
}
