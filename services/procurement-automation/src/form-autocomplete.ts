import {
  ComplianceFormTemplate,
  FormField,
  ProcurementFramework,
  ATODocumentType,
} from './types.js';

/**
 * Organization Profile - used for auto-filling forms
 */
export interface OrganizationProfile {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  website: string;
  dunsNumber?: string;
  cageCode?: string;
  einTaxId?: string;
  naicsCodes: string[];
  authorizedRepresentative: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
  technicalContact: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
  securityContact: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
}

/**
 * System Profile - technical details for auto-fill
 */
export interface SystemProfile {
  systemName: string;
  systemAcronym: string;
  systemDescription: string;
  systemType: 'major_application' | 'general_support_system' | 'minor_application';
  deploymentModel: 'public_cloud' | 'private_cloud' | 'hybrid' | 'on_premise';
  cloudProvider?: string;
  cloudRegions?: string[];
  operationalStatus: 'operational' | 'under_development' | 'undergoing_modification';
  systemBoundary: {
    components: string[];
    dataFlows: string[];
    externalInterfaces: string[];
    networkDiagram?: string;
  };
  dataTypes: string[];
  userTypes: string[];
  estimatedUsers: number;
  fipsCategory: {
    confidentiality: 'low' | 'moderate' | 'high';
    integrity: 'low' | 'moderate' | 'high';
    availability: 'low' | 'moderate' | 'high';
  };
}

/**
 * Auto-fill data sources
 */
export interface AutoFillDataSources {
  organization: OrganizationProfile;
  system: SystemProfile;
  existingControls?: Record<string, string>; // Control ID -> Implementation narrative
  previousSubmissions?: Record<string, unknown>[];
}

/**
 * Form completion result
 */
export interface FormCompletionResult {
  formId: string;
  completionPercentage: number;
  fields: {
    fieldId: string;
    value: unknown;
    source: 'auto_filled' | 'manual' | 'inherited' | 'empty';
    confidence: number;
  }[];
  warnings: string[];
  requiresManualReview: string[];
}

/**
 * FormAutoCompleteEngine - Auto-fills compliance forms
 */
export class FormAutoCompleteEngine {
  private dataSources: AutoFillDataSources;
  private formTemplates: Map<string, ComplianceFormTemplate> = new Map();

  constructor(dataSources: AutoFillDataSources) {
    this.dataSources = dataSources;
    this.initializeTemplates();
  }

  /**
   * Initialize built-in form templates
   */
  private initializeTemplates(): void {
    // SSP Form Template
    this.formTemplates.set('ssp_fedramp', {
      id: 'ssp_fedramp',
      name: 'FedRAMP System Security Plan',
      framework: 'FedRAMP',
      documentType: 'SSP',
      version: '3.0',
      sections: [
        {
          id: 'system_info',
          title: 'System Information',
          fields: [
            { id: 'system_name', label: 'System Name', type: 'text', required: true, autoFillSource: 'system.systemName' },
            { id: 'system_acronym', label: 'System Acronym', type: 'text', required: true, autoFillSource: 'system.systemAcronym' },
            { id: 'system_description', label: 'System Description', type: 'textarea', required: true, autoFillSource: 'system.systemDescription' },
            { id: 'system_type', label: 'System Type', type: 'select', required: true, options: ['Major Application', 'General Support System', 'Minor Application'], autoFillSource: 'system.systemType' },
            { id: 'deployment_model', label: 'Deployment Model', type: 'select', required: true, options: ['Public Cloud', 'Private Cloud', 'Hybrid', 'On-Premise'], autoFillSource: 'system.deploymentModel' },
            { id: 'operational_status', label: 'Operational Status', type: 'select', required: true, options: ['Operational', 'Under Development', 'Undergoing Modification'], autoFillSource: 'system.operationalStatus' },
          ],
        },
        {
          id: 'org_info',
          title: 'Organization Information',
          fields: [
            { id: 'org_name', label: 'Organization Name', type: 'text', required: true, autoFillSource: 'organization.name' },
            { id: 'org_address', label: 'Address', type: 'text', required: true, autoFillSource: 'organization.address' },
            { id: 'org_city', label: 'City', type: 'text', required: true, autoFillSource: 'organization.city' },
            { id: 'org_state', label: 'State', type: 'text', required: true, autoFillSource: 'organization.state' },
            { id: 'org_zip', label: 'ZIP Code', type: 'text', required: true, autoFillSource: 'organization.zip' },
            { id: 'duns', label: 'DUNS Number', type: 'text', required: false, autoFillSource: 'organization.dunsNumber' },
            { id: 'cage_code', label: 'CAGE Code', type: 'text', required: false, autoFillSource: 'organization.cageCode' },
          ],
        },
        {
          id: 'contacts',
          title: 'Key Contacts',
          fields: [
            { id: 'auth_rep_name', label: 'Authorized Representative Name', type: 'text', required: true, autoFillSource: 'organization.authorizedRepresentative.name' },
            { id: 'auth_rep_title', label: 'Authorized Representative Title', type: 'text', required: true, autoFillSource: 'organization.authorizedRepresentative.title' },
            { id: 'auth_rep_email', label: 'Authorized Representative Email', type: 'text', required: true, autoFillSource: 'organization.authorizedRepresentative.email' },
            { id: 'tech_contact_name', label: 'Technical Contact Name', type: 'text', required: true, autoFillSource: 'organization.technicalContact.name' },
            { id: 'tech_contact_email', label: 'Technical Contact Email', type: 'text', required: true, autoFillSource: 'organization.technicalContact.email' },
            { id: 'sec_contact_name', label: 'Security Contact Name', type: 'text', required: true, autoFillSource: 'organization.securityContact.name' },
            { id: 'sec_contact_email', label: 'Security Contact Email', type: 'text', required: true, autoFillSource: 'organization.securityContact.email' },
          ],
        },
        {
          id: 'categorization',
          title: 'Security Categorization (FIPS 199)',
          fields: [
            { id: 'confidentiality', label: 'Confidentiality Impact', type: 'select', required: true, options: ['Low', 'Moderate', 'High'], autoFillSource: 'system.fipsCategory.confidentiality' },
            { id: 'integrity', label: 'Integrity Impact', type: 'select', required: true, options: ['Low', 'Moderate', 'High'], autoFillSource: 'system.fipsCategory.integrity' },
            { id: 'availability', label: 'Availability Impact', type: 'select', required: true, options: ['Low', 'Moderate', 'High'], autoFillSource: 'system.fipsCategory.availability' },
          ],
        },
        {
          id: 'boundary',
          title: 'System Boundary',
          fields: [
            { id: 'components', label: 'System Components', type: 'textarea', required: true, autoFillSource: 'system.systemBoundary.components' },
            { id: 'data_flows', label: 'Data Flows', type: 'textarea', required: true, autoFillSource: 'system.systemBoundary.dataFlows' },
            { id: 'external_interfaces', label: 'External Interfaces', type: 'textarea', required: true, autoFillSource: 'system.systemBoundary.externalInterfaces' },
          ],
        },
      ],
    });

    // POA&M Template
    this.formTemplates.set('poam_standard', {
      id: 'poam_standard',
      name: 'Plan of Action and Milestones',
      framework: 'FedRAMP',
      documentType: 'POA_M',
      version: '1.0',
      sections: [
        {
          id: 'finding_info',
          title: 'Finding Information',
          fields: [
            { id: 'finding_id', label: 'Finding ID', type: 'text', required: true },
            { id: 'control_id', label: 'Related Control', type: 'text', required: true },
            { id: 'weakness_desc', label: 'Weakness Description', type: 'textarea', required: true },
            { id: 'risk_level', label: 'Risk Level', type: 'select', required: true, options: ['Critical', 'High', 'Moderate', 'Low'] },
            { id: 'cve_id', label: 'CVE ID (if applicable)', type: 'text', required: false },
          ],
        },
        {
          id: 'remediation',
          title: 'Remediation Plan',
          fields: [
            { id: 'remediation_desc', label: 'Remediation Description', type: 'textarea', required: true },
            { id: 'milestone_1', label: 'Milestone 1', type: 'text', required: true },
            { id: 'milestone_1_date', label: 'Milestone 1 Target Date', type: 'date', required: true },
            { id: 'responsible_party', label: 'Responsible Party', type: 'text', required: true },
            { id: 'estimated_completion', label: 'Estimated Completion Date', type: 'date', required: true },
            { id: 'resources_required', label: 'Resources Required', type: 'textarea', required: false },
          ],
        },
      ],
    });
  }

  /**
   * Get a form template by ID
   */
  getTemplate(templateId: string): ComplianceFormTemplate | undefined {
    return this.formTemplates.get(templateId);
  }

  /**
   * List available templates
   */
  listTemplates(): { id: string; name: string; framework: ProcurementFramework; documentType: ATODocumentType }[] {
    return Array.from(this.formTemplates.values()).map((t) => ({
      id: t.id,
      name: t.name,
      framework: t.framework,
      documentType: t.documentType,
    }));
  }

  /**
   * Auto-complete a form template
   */
  autoCompleteForm(templateId: string): FormCompletionResult {
    const template = this.formTemplates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const fields: FormCompletionResult['fields'] = [];
    const warnings: string[] = [];
    const requiresManualReview: string[] = [];
    let filledCount = 0;
    let totalRequired = 0;

    for (const section of template.sections) {
      for (const field of section.fields) {
        if (field.required) totalRequired++;

        const result = this.autoFillField(field);
        fields.push(result);

        if (result.source === 'auto_filled') {
          filledCount++;
          if (result.confidence < 0.8) {
            requiresManualReview.push(field.id);
          }
        } else if (field.required) {
          warnings.push(`Required field "${field.label}" could not be auto-filled`);
        }
      }
    }

    return {
      formId: templateId,
      completionPercentage: totalRequired > 0 ? Math.round((filledCount / totalRequired) * 100) : 0,
      fields,
      warnings,
      requiresManualReview,
    };
  }

  /**
   * Auto-fill a single field
   */
  private autoFillField(field: FormField): FormCompletionResult['fields'][0] {
    if (!field.autoFillSource) {
      return {
        fieldId: field.id,
        value: field.defaultValue ?? null,
        source: field.defaultValue ? 'inherited' : 'empty',
        confidence: field.defaultValue ? 0.5 : 0,
      };
    }

    const value = this.resolveAutoFillSource(field.autoFillSource);

    if (value !== undefined && value !== null) {
      // Transform value if needed
      const transformedValue = this.transformValue(value, field);

      return {
        fieldId: field.id,
        value: transformedValue,
        source: 'auto_filled',
        confidence: this.calculateConfidence(field, transformedValue),
      };
    }

    return {
      fieldId: field.id,
      value: null,
      source: 'empty',
      confidence: 0,
    };
  }

  /**
   * Resolve auto-fill source path to value
   */
  private resolveAutoFillSource(source: string): unknown {
    const parts = source.split('.');
    let current: unknown = this.dataSources;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Transform value for display
   */
  private transformValue(value: unknown, field: FormField): unknown {
    if (Array.isArray(value)) {
      return value.join('\n');
    }

    if (field.type === 'select' && field.options) {
      // Map internal values to display values
      const displayMap: Record<string, string> = {
        major_application: 'Major Application',
        general_support_system: 'General Support System',
        minor_application: 'Minor Application',
        public_cloud: 'Public Cloud',
        private_cloud: 'Private Cloud',
        hybrid: 'Hybrid',
        on_premise: 'On-Premise',
        operational: 'Operational',
        under_development: 'Under Development',
        undergoing_modification: 'Undergoing Modification',
        low: 'Low',
        moderate: 'Moderate',
        high: 'High',
      };

      return displayMap[String(value)] || value;
    }

    return value;
  }

  /**
   * Calculate confidence in auto-filled value
   */
  private calculateConfidence(field: FormField, value: unknown): number {
    if (!value) return 0;

    // Higher confidence for exact source matches
    if (field.autoFillSource?.startsWith('organization.')) return 0.95;
    if (field.autoFillSource?.startsWith('system.')) return 0.9;

    // Lower confidence for derived/transformed values
    if (Array.isArray(value)) return 0.8;

    return 0.85;
  }

  /**
   * Update data sources
   */
  updateDataSources(sources: Partial<AutoFillDataSources>): void {
    this.dataSources = { ...this.dataSources, ...sources };
  }

  /**
   * Add custom form template
   */
  addTemplate(template: ComplianceFormTemplate): void {
    this.formTemplates.set(template.id, template);
  }
}
