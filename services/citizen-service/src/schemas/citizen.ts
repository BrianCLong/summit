import { z } from 'zod';

/**
 * Citizen Profile Schema
 * Core identity and demographic information ingested once, reused across services
 */
export const CitizenProfileSchema = z.object({
  id: z.string().uuid(),
  nationalId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
  nationality: z.string().optional(),

  // Contact information
  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  }).optional(),

  // Verification status
  verified: z.boolean().default(false),
  verificationDate: z.string().datetime().optional(),

  // Data provenance
  source: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CitizenProfile = z.infer<typeof CitizenProfileSchema>;

/**
 * Service Domain - represents different government service areas
 */
export const ServiceDomainSchema = z.enum([
  'education',
  'healthcare',
  'administration',
  'taxation',
  'social_services',
  'transportation',
  'housing',
  'employment',
]);

export type ServiceDomain = z.infer<typeof ServiceDomainSchema>;

/**
 * Citizen Service Record - tracks interactions across service domains
 */
export const ServiceRecordSchema = z.object({
  id: z.string().uuid(),
  citizenId: z.string().uuid(),
  domain: ServiceDomainSchema,
  serviceType: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'rejected']),
  requestDate: z.string().datetime(),
  completionDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),

  // Linked documents/records from other domains
  linkedRecords: z.array(z.string().uuid()).optional(),
});

export type ServiceRecord = z.infer<typeof ServiceRecordSchema>;

/**
 * Data Consent - tracks citizen consent for data sharing
 */
export const DataConsentSchema = z.object({
  citizenId: z.string().uuid(),
  domain: ServiceDomainSchema,
  consentGiven: z.boolean(),
  consentDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  scope: z.array(z.string()), // What data can be shared
});

export type DataConsent = z.infer<typeof DataConsentSchema>;

/**
 * Service Eligibility - pre-computed eligibility for proactive services
 */
export const EligibilitySchema = z.object({
  citizenId: z.string().uuid(),
  domain: ServiceDomainSchema,
  serviceType: z.string(),
  eligible: z.boolean(),
  reason: z.string().optional(),
  computedAt: z.string().datetime(),
  validUntil: z.string().datetime(),
});

export type Eligibility = z.infer<typeof EligibilitySchema>;
