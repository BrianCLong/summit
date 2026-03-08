"use strict";
/**
 * Integration Adapters for External Defense Logistics Systems
 *
 * Provides standardized interfaces for:
 * - DLA (Defense Logistics Agency)
 * - NATO NSPA (Support and Procurement Agency)
 * - Allied logistics exchanges
 * - Military service-specific systems (GCSS-Army, NAVSUP, AFMC)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stanag4406MessageSchema = exports.AlliedLogisticsRequestSchema = exports.NspaOrderSchema = exports.NspaContractNoticeSchema = exports.DlaStatusResponseSchema = exports.DlaRequisitionSchema = void 0;
const zod_1 = require("zod");
// =============================================================================
// DLA INTEGRATION TYPES
// =============================================================================
exports.DlaRequisitionSchema = zod_1.z.object({
    documentNumber: zod_1.z.string().length(14), // MILSTRIP format
    requisitionDate: zod_1.z.string().datetime(),
    routingIdentifierCode: zod_1.z.string().length(3),
    mediaStatusCode: zod_1.z.string().length(1),
    fundCode: zod_1.z.string().length(2),
    distributionCode: zod_1.z.string().length(3),
    projectCode: zod_1.z.string().length(3).optional(),
    priorityDesignatorCode: zod_1.z.string().length(2),
    requiredDeliveryDate: zod_1.z.string().length(3), // Julian date
    adviceCode: zod_1.z.string().length(2).optional(),
    nsn: zod_1.z.string().length(13), // National Stock Number
    unitOfIssue: zod_1.z.string().length(2),
    quantity: zod_1.z.number().int().positive(),
    unitPrice: zod_1.z.number().positive().optional(),
    supplementaryAddress: zod_1.z.string().length(6).optional(),
    signalCode: zod_1.z.string().length(1),
    demandCode: zod_1.z.string().length(1),
});
exports.DlaStatusResponseSchema = zod_1.z.object({
    documentNumber: zod_1.z.string(),
    statusCode: zod_1.z.string().length(2),
    statusDate: zod_1.z.string().datetime(),
    estimatedDeliveryDate: zod_1.z.string().datetime().optional(),
    shipmentTrackingNumber: zod_1.z.string().optional(),
    remarks: zod_1.z.string().optional(),
});
// =============================================================================
// NATO NSPA INTEGRATION TYPES
// =============================================================================
exports.NspaContractNoticeSchema = zod_1.z.object({
    noticeId: zod_1.z.string(),
    noticeType: zod_1.z.enum(['invitation_to_bid', 'contract_award', 'amendment', 'cancellation']),
    procurementMethod: zod_1.z.enum(['open', 'restricted', 'negotiated', 'framework']),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    natoStockNumbers: zod_1.z.array(zod_1.z.string()),
    estimatedValue: zod_1.z.number().positive().optional(),
    currency: zod_1.z.string().length(3),
    participatingNations: zod_1.z.array(zod_1.z.string().length(3)), // ISO 3166-1 alpha-3
    submissionDeadline: zod_1.z.string().datetime().optional(),
    contractDuration: zod_1.z.string().optional(),
    deliveryLocations: zod_1.z.array(zod_1.z.string()),
    securityClassification: zod_1.z.enum(['NATO_UNCLASSIFIED', 'NATO_RESTRICTED', 'NATO_CONFIDENTIAL']),
    publishedDate: zod_1.z.string().datetime(),
});
exports.NspaOrderSchema = zod_1.z.object({
    orderId: zod_1.z.string(),
    contractReference: zod_1.z.string(),
    orderingNation: zod_1.z.string().length(3),
    items: zod_1.z.array(zod_1.z.object({
        nsn: zod_1.z.string(),
        description: zod_1.z.string(),
        quantity: zod_1.z.number().positive(),
        unitPrice: zod_1.z.number().positive(),
    })),
    totalValue: zod_1.z.number().positive(),
    deliveryAddress: zod_1.z.string(),
    requestedDeliveryDate: zod_1.z.string().datetime(),
    status: zod_1.z.enum(['submitted', 'confirmed', 'in_production', 'shipped', 'delivered']),
});
// =============================================================================
// ALLIED LOGISTICS EXCHANGE TYPES
// =============================================================================
exports.AlliedLogisticsRequestSchema = zod_1.z.object({
    requestId: zod_1.z.string().uuid(),
    requestType: zod_1.z.enum(['supply', 'transport', 'maintenance', 'medical', 'fuel']),
    requestingNation: zod_1.z.string().length(3),
    supportingNation: zod_1.z.string().length(3).optional(),
    operationName: zod_1.z.string().optional(),
    urgency: zod_1.z.enum(['routine', 'priority', 'immediate', 'flash']),
    items: zod_1.z.array(zod_1.z.object({
        nsn: zod_1.z.string().optional(),
        description: zod_1.z.string(),
        quantity: zod_1.z.number().positive(),
        unitOfMeasure: zod_1.z.string(),
    })),
    deliveryLocation: zod_1.z.object({
        mgrs: zod_1.z.string().optional(), // Military Grid Reference System
        latitude: zod_1.z.number().optional(),
        longitude: zod_1.z.number().optional(),
        locationName: zod_1.z.string(),
    }),
    requiredDeliveryDate: zod_1.z.string().datetime(),
    classification: zod_1.z.enum(['UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET']),
    createdAt: zod_1.z.string().datetime(),
});
// =============================================================================
// STANAG 4406 MESSAGE TYPES (NATO Standard)
// =============================================================================
exports.Stanag4406MessageSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    precedence: zod_1.z.enum(['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH']),
    classification: zod_1.z.enum(['NATO_UNCLASSIFIED', 'NATO_RESTRICTED', 'NATO_CONFIDENTIAL', 'NATO_SECRET']),
    originator: zod_1.z.string(),
    recipients: zod_1.z.array(zod_1.z.string()),
    subject: zod_1.z.string(),
    dtg: zod_1.z.string(), // Date-Time Group
    body: zod_1.z.string(),
    attachments: zod_1.z
        .array(zod_1.z.object({
        filename: zod_1.z.string(),
        mimeType: zod_1.z.string(),
        size: zod_1.z.number(),
        checksum: zod_1.z.string(),
    }))
        .optional(),
});
