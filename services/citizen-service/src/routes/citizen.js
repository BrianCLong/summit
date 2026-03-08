"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const CitizenService_js_1 = require("../services/CitizenService.js");
const citizen_js_1 = require("../schemas/citizen.js");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Schemas for route validation
const RegisterCitizenSchema = zod_1.z.object({
    nationalId: zod_1.z.string().min(1),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    middleName: zod_1.z.string().optional(),
    dateOfBirth: zod_1.z.string().optional(),
    gender: zod_1.z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
    nationality: zod_1.z.string().optional(),
    contact: zod_1.z.object({
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.object({
            street: zod_1.z.string().optional(),
            city: zod_1.z.string().optional(),
            state: zod_1.z.string().optional(),
            postalCode: zod_1.z.string().optional(),
            country: zod_1.z.string().optional(),
        }).optional(),
    }).optional(),
    source: zod_1.z.string().default('api'),
});
const ConsentSchema = zod_1.z.object({
    domain: citizen_js_1.ServiceDomainSchema,
    scope: zod_1.z.array(zod_1.z.string()),
    expiryDays: zod_1.z.number().optional(),
});
const ServiceRequestSchema = zod_1.z.object({
    domain: citizen_js_1.ServiceDomainSchema,
    serviceType: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
const EligibilitySchema = zod_1.z.object({
    domain: citizen_js_1.ServiceDomainSchema,
    serviceType: zod_1.z.string(),
});
/**
 * POST /citizens
 * Register or update a citizen - ingest data once
 */
router.post('/citizens', async (req, res) => {
    try {
        const data = RegisterCitizenSchema.parse(req.body);
        const citizen = await CitizenService_js_1.citizenService.registerCitizen({
            nationalId: data.nationalId,
            firstName: data.firstName,
            lastName: data.lastName,
            middleName: data.middleName,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            nationality: data.nationality,
            contact: data.contact,
            source: data.source,
        });
        res.status(201).json(citizen);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
/**
 * GET /citizens/:id
 * Get citizen profile
 */
router.get('/citizens/:id', async (req, res) => {
    try {
        const view = await CitizenService_js_1.citizenService.getUnifiedView(req.params.id);
        if (!view.profile) {
            res.status(404).json({ error: 'Citizen not found' });
            return;
        }
        res.json(view);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /citizens/:id/consent
 * Grant consent for data sharing
 */
router.post('/citizens/:id/consent', async (req, res) => {
    try {
        const data = ConsentSchema.parse(req.body);
        const consent = await CitizenService_js_1.citizenService.grantConsent({
            citizenId: req.params.id,
            domain: data.domain,
            scope: data.scope,
            expiryDays: data.expiryDays,
        });
        res.status(201).json(consent);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
/**
 * POST /citizens/:id/services
 * Request a government service
 */
router.post('/citizens/:id/services', async (req, res) => {
    try {
        const data = ServiceRequestSchema.parse(req.body);
        const record = await CitizenService_js_1.citizenService.requestService({
            citizenId: req.params.id,
            domain: data.domain,
            serviceType: data.serviceType,
            metadata: data.metadata,
        });
        res.status(201).json(record);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Consent required')) {
            res.status(403).json({ error: error.message });
        }
        else if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
/**
 * GET /citizens/:id/recommendations
 * Get proactive service recommendations
 */
router.get('/citizens/:id/recommendations', async (req, res) => {
    try {
        const recommendations = await CitizenService_js_1.citizenService.getRecommendations(req.params.id);
        res.json({ recommendations });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /citizens/:id/eligibility
 * Compute eligibility for a service
 */
router.post('/citizens/:id/eligibility', async (req, res) => {
    try {
        const data = EligibilitySchema.parse(req.body);
        const eligibility = await CitizenService_js_1.citizenService.computeEligibility({
            citizenId: req.params.id,
            domain: data.domain,
            serviceType: data.serviceType,
        });
        res.json(eligibility);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
exports.default = router;
