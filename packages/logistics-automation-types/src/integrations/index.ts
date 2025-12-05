/**
 * Integration Adapters for External Defense Logistics Systems
 *
 * Provides standardized interfaces for:
 * - DLA (Defense Logistics Agency)
 * - NATO NSPA (Support and Procurement Agency)
 * - Allied logistics exchanges
 * - Military service-specific systems (GCSS-Army, NAVSUP, AFMC)
 */

import { z } from 'zod';
import { SupplySystemSchema } from '../index.js';

// =============================================================================
// DLA INTEGRATION TYPES
// =============================================================================

export const DlaRequisitionSchema = z.object({
  documentNumber: z.string().length(14), // MILSTRIP format
  requisitionDate: z.string().datetime(),
  routingIdentifierCode: z.string().length(3),
  mediaStatusCode: z.string().length(1),
  fundCode: z.string().length(2),
  distributionCode: z.string().length(3),
  projectCode: z.string().length(3).optional(),
  priorityDesignatorCode: z.string().length(2),
  requiredDeliveryDate: z.string().length(3), // Julian date
  adviceCode: z.string().length(2).optional(),
  nsn: z.string().length(13), // National Stock Number
  unitOfIssue: z.string().length(2),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive().optional(),
  supplementaryAddress: z.string().length(6).optional(),
  signalCode: z.string().length(1),
  demandCode: z.string().length(1),
});
export type DlaRequisition = z.infer<typeof DlaRequisitionSchema>;

export const DlaStatusResponseSchema = z.object({
  documentNumber: z.string(),
  statusCode: z.string().length(2),
  statusDate: z.string().datetime(),
  estimatedDeliveryDate: z.string().datetime().optional(),
  shipmentTrackingNumber: z.string().optional(),
  remarks: z.string().optional(),
});
export type DlaStatusResponse = z.infer<typeof DlaStatusResponseSchema>;

// =============================================================================
// NATO NSPA INTEGRATION TYPES
// =============================================================================

export const NspaContractNoticeSchema = z.object({
  noticeId: z.string(),
  noticeType: z.enum(['invitation_to_bid', 'contract_award', 'amendment', 'cancellation']),
  procurementMethod: z.enum(['open', 'restricted', 'negotiated', 'framework']),
  title: z.string(),
  description: z.string(),
  natoStockNumbers: z.array(z.string()),
  estimatedValue: z.number().positive().optional(),
  currency: z.string().length(3),
  participatingNations: z.array(z.string().length(3)), // ISO 3166-1 alpha-3
  submissionDeadline: z.string().datetime().optional(),
  contractDuration: z.string().optional(),
  deliveryLocations: z.array(z.string()),
  securityClassification: z.enum(['NATO_UNCLASSIFIED', 'NATO_RESTRICTED', 'NATO_CONFIDENTIAL']),
  publishedDate: z.string().datetime(),
});
export type NspaContractNotice = z.infer<typeof NspaContractNoticeSchema>;

export const NspaOrderSchema = z.object({
  orderId: z.string(),
  contractReference: z.string(),
  orderingNation: z.string().length(3),
  items: z.array(
    z.object({
      nsn: z.string(),
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
    }),
  ),
  totalValue: z.number().positive(),
  deliveryAddress: z.string(),
  requestedDeliveryDate: z.string().datetime(),
  status: z.enum(['submitted', 'confirmed', 'in_production', 'shipped', 'delivered']),
});
export type NspaOrder = z.infer<typeof NspaOrderSchema>;

// =============================================================================
// ALLIED LOGISTICS EXCHANGE TYPES
// =============================================================================

export const AlliedLogisticsRequestSchema = z.object({
  requestId: z.string().uuid(),
  requestType: z.enum(['supply', 'transport', 'maintenance', 'medical', 'fuel']),
  requestingNation: z.string().length(3),
  supportingNation: z.string().length(3).optional(),
  operationName: z.string().optional(),
  urgency: z.enum(['routine', 'priority', 'immediate', 'flash']),
  items: z.array(
    z.object({
      nsn: z.string().optional(),
      description: z.string(),
      quantity: z.number().positive(),
      unitOfMeasure: z.string(),
    }),
  ),
  deliveryLocation: z.object({
    mgrs: z.string().optional(), // Military Grid Reference System
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    locationName: z.string(),
  }),
  requiredDeliveryDate: z.string().datetime(),
  classification: z.enum(['UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET']),
  createdAt: z.string().datetime(),
});
export type AlliedLogisticsRequest = z.infer<typeof AlliedLogisticsRequestSchema>;

// =============================================================================
// ADAPTER INTERFACES
// =============================================================================

export interface IntegrationAdapter {
  system: z.infer<typeof SupplySystemSchema>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface DlaAdapter extends IntegrationAdapter {
  submitRequisition(requisition: DlaRequisition): Promise<{ documentNumber: string }>;
  getStatus(documentNumber: string): Promise<DlaStatusResponse>;
  searchCatalog(nsn: string): Promise<unknown>;
}

export interface NspaAdapter extends IntegrationAdapter {
  getContractNotices(filters?: Record<string, unknown>): Promise<NspaContractNotice[]>;
  submitOrder(order: NspaOrder): Promise<{ orderId: string }>;
  getOrderStatus(orderId: string): Promise<NspaOrder>;
}

export interface AlliedLogexAdapter extends IntegrationAdapter {
  submitRequest(request: AlliedLogisticsRequest): Promise<{ requestId: string }>;
  getRequestStatus(requestId: string): Promise<AlliedLogisticsRequest>;
  searchAvailability(nsn: string, nations?: string[]): Promise<unknown>;
}

// =============================================================================
// STANAG 4406 MESSAGE TYPES (NATO Standard)
// =============================================================================

export const Stanag4406MessageSchema = z.object({
  messageId: z.string(),
  precedence: z.enum(['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH']),
  classification: z.enum(['NATO_UNCLASSIFIED', 'NATO_RESTRICTED', 'NATO_CONFIDENTIAL', 'NATO_SECRET']),
  originator: z.string(),
  recipients: z.array(z.string()),
  subject: z.string(),
  dtg: z.string(), // Date-Time Group
  body: z.string(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        mimeType: z.string(),
        size: z.number(),
        checksum: z.string(),
      }),
    )
    .optional(),
});
export type Stanag4406Message = z.infer<typeof Stanag4406MessageSchema>;
