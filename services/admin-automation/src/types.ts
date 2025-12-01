import { z } from 'zod';

// Citizen Profile - aggregated from all submissions
export const CitizenProfileSchema = z.object({
  id: z.string().uuid(),
  identifiers: z.object({
    ssn: z.string().optional(),
    driverLicense: z.string().optional(),
    passportNumber: z.string().optional(),
    nationalId: z.string().optional(),
  }),
  personal: z.object({
    firstName: z.string(),
    lastName: z.string(),
    middleName: z.string().optional(),
    dateOfBirth: z.string(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
  }),
  contact: z.object({
    email: z.string().email(),
    phone: z.string(),
    alternatePhone: z.string().optional(),
  }),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().default('US'),
  }),
  employment: z
    .object({
      employer: z.string(),
      occupation: z.string(),
      income: z.number(),
      employmentStatus: z.enum(['employed', 'unemployed', 'self-employed', 'retired']),
    })
    .optional(),
  household: z
    .object({
      size: z.number(),
      dependents: z.number(),
      housingType: z.enum(['own', 'rent', 'other']),
    })
    .optional(),
  documents: z.array(
    z.object({
      type: z.string(),
      documentId: z.string(),
      uploadedAt: z.string(),
      expiresAt: z.string().optional(),
    }),
  ),
  submissions: z.array(
    z.object({
      formId: z.string(),
      submittedAt: z.string(),
      status: z.string(),
    }),
  ),
  lastUpdated: z.string(),
});

export type CitizenProfile = z.infer<typeof CitizenProfileSchema>;

// Form Field Definition
export const FormFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'number', 'date', 'select', 'checkbox', 'file', 'address', 'phone', 'email']),
  required: z.boolean(),
  profileMapping: z.string().optional(), // Maps to CitizenProfile path
  validation: z.string().optional(),
});

export type FormField = z.infer<typeof FormFieldSchema>;

// Service Need Prediction
export const ServiceNeedSchema = z.object({
  id: z.string().uuid(),
  citizenId: z.string().uuid(),
  serviceType: z.string(),
  predictedNeedDate: z.string(),
  confidence: z.number().min(0).max(1),
  triggers: z.array(z.string()),
  status: z.enum(['predicted', 'notified', 'resolved', 'dismissed']),
  autoResolvable: z.boolean(),
});

export type ServiceNeed = z.infer<typeof ServiceNeedSchema>;

// Workload Metrics
export const WorkloadMetricsSchema = z.object({
  period: z.string(),
  totalRequests: z.number(),
  autoCompletedFields: z.number(),
  reusedDataPoints: z.number(),
  proactiveResolutions: z.number(),
  manualInterventions: z.number(),
  timeSavedMinutes: z.number(),
  workloadReductionPercent: z.number(),
});

export type WorkloadMetrics = z.infer<typeof WorkloadMetricsSchema>;
