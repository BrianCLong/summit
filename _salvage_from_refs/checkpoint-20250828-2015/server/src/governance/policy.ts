/**
 * Defines the data classes for retention policies.
 */
export type RetentionClass = 'OSINT_RAW' | 'CASE_PDF' | 'EXPORT_ZIP' | 'GENERAL';

/**
 * Defines the structure of a retention policy.
 */
export interface RetentionPolicy {
  klass: RetentionClass;
  ttlDays: number;
  description: string;
}

/**
 * Default retention policies for the system.
 * These can be overridden by tenant-specific configurations.
 */
export const defaultPolicies: RetentionPolicy[] = [
  {
    klass: 'OSINT_RAW',
    ttlDays: 90,
    description: 'Raw Open-Source Intelligence data, typically high volume and transient.'
  },
  {
    klass: 'CASE_PDF',
    ttlDays: 365 * 5, // 5 years
    description: 'Exported PDF reports for case files. Long-term retention for compliance.'
  },
  {
    klass: 'EXPORT_ZIP',
    ttlDays: 180,
    description: 'Zipped archives of exported data. Retained for medium-term access.'
  },
  {
    klass: 'GENERAL',
    ttlDays: 365 * 7, // 7 years
    description: 'Default retention for any data asset without a specific classification.'
  },
];
