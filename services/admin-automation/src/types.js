"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkloadMetricsSchema = exports.ServiceNeedSchema = exports.FormFieldSchema = exports.CitizenProfileSchema = void 0;
const zod_1 = require("zod");
// Citizen Profile - aggregated from all submissions
exports.CitizenProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    identifiers: zod_1.z.object({
        ssn: zod_1.z.string().optional(),
        driverLicense: zod_1.z.string().optional(),
        passportNumber: zod_1.z.string().optional(),
        nationalId: zod_1.z.string().optional(),
    }),
    personal: zod_1.z.object({
        firstName: zod_1.z.string(),
        lastName: zod_1.z.string(),
        middleName: zod_1.z.string().optional(),
        dateOfBirth: zod_1.z.string(),
        gender: zod_1.z.string().optional(),
        maritalStatus: zod_1.z.string().optional(),
    }),
    contact: zod_1.z.object({
        email: zod_1.z.string().email(),
        phone: zod_1.z.string(),
        alternatePhone: zod_1.z.string().optional(),
    }),
    address: zod_1.z.object({
        street: zod_1.z.string(),
        city: zod_1.z.string(),
        state: zod_1.z.string(),
        zipCode: zod_1.z.string(),
        country: zod_1.z.string().default('US'),
    }),
    employment: zod_1.z
        .object({
        employer: zod_1.z.string(),
        occupation: zod_1.z.string(),
        income: zod_1.z.number(),
        employmentStatus: zod_1.z.enum(['employed', 'unemployed', 'self-employed', 'retired']),
    })
        .optional(),
    household: zod_1.z
        .object({
        size: zod_1.z.number(),
        dependents: zod_1.z.number(),
        housingType: zod_1.z.enum(['own', 'rent', 'other']),
    })
        .optional(),
    documents: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        documentId: zod_1.z.string(),
        uploadedAt: zod_1.z.string(),
        expiresAt: zod_1.z.string().optional(),
    })),
    submissions: zod_1.z.array(zod_1.z.object({
        formId: zod_1.z.string(),
        submittedAt: zod_1.z.string(),
        status: zod_1.z.string(),
    })),
    lastUpdated: zod_1.z.string(),
});
// Form Field Definition
exports.FormFieldSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['text', 'number', 'date', 'select', 'checkbox', 'file', 'address', 'phone', 'email']),
    required: zod_1.z.boolean(),
    profileMapping: zod_1.z.string().optional(), // Maps to CitizenProfile path
    validation: zod_1.z.string().optional(),
});
// Service Need Prediction
exports.ServiceNeedSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    citizenId: zod_1.z.string().uuid(),
    serviceType: zod_1.z.string(),
    predictedNeedDate: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    triggers: zod_1.z.array(zod_1.z.string()),
    status: zod_1.z.enum(['predicted', 'notified', 'resolved', 'dismissed']),
    autoResolvable: zod_1.z.boolean(),
});
// Workload Metrics
exports.WorkloadMetricsSchema = zod_1.z.object({
    period: zod_1.z.string(),
    totalRequests: zod_1.z.number(),
    autoCompletedFields: zod_1.z.number(),
    reusedDataPoints: zod_1.z.number(),
    proactiveResolutions: zod_1.z.number(),
    manualInterventions: zod_1.z.number(),
    timeSavedMinutes: zod_1.z.number(),
    workloadReductionPercent: zod_1.z.number(),
});
