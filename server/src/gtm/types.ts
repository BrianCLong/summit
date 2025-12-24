// @ts-nocheck
import { z } from 'zod';

export enum EvidenceType {
  CustomerMetric = 'customer_metric',
  CustomerQuote = 'customer_quote',
  Certification = 'certification',
  Sla = 'sla',
  Audit = 'audit',
  SecurityAttestation = 'security_attestation',
  ProductTelemetry = 'product_telemetry',
  DemoVideo = 'demo_video',
}

export enum RiskTier {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum ClaimStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Expired = 'expired',
}

export type Channel = 'web' | 'sales' | 'content';

export type ApprovalRole = 'legal' | 'security' | 'pmm' | 'evidence';

export interface ApprovalRecord {
  approver: ApprovalRole;
  approvedAt: string;
  notes?: string;
}

export interface Claim {
  claimId: string;
  message: string;
  evidenceType: EvidenceType;
  evidenceSource: string;
  status: ClaimStatus;
  reviewDate: string;
  owner: string;
  channels: Channel[];
  riskTier: RiskTier;
  approvals: ApprovalRecord[];
  createdAt: string;
  updatedAt: string;
  expiry?: string;
  publishedAt?: string;
  forwardLooking?: boolean;
  complianceSurface?: string[];
}

export const ClaimInputSchema = z.object({
  message: z.string().min(10),
  evidenceType: z.nativeEnum(EvidenceType),
  evidenceSource: z.string().min(3),
  owner: z.string().min(2),
  channels: z.array(z.union([z.literal('web'), z.literal('sales'), z.literal('content')])).min(1),
  riskTier: z.nativeEnum(RiskTier).optional(),
  reviewDate: z.string().optional(),
  forwardLooking: z.boolean().optional(),
  complianceSurface: z.array(z.string()).optional(),
});

export type ClaimInput = z.infer<typeof ClaimInputSchema>;

export interface MessageHouseLayer {
  headline: string;
  proofPoints: string[];
  objections: string[];
  differentiators: string[];
}

export interface MessageHouseVariant extends MessageHouseLayer {
  name: 'regulated' | 'mid-market' | 'enterprise';
  additionalControls: string[];
}

export interface MessageHouse {
  core: MessageHouseLayer;
  variants: MessageHouseVariant[];
}

export interface IcpBrief {
  tiers: Array<{
    name: 'regulated' | 'mid-market' | 'enterprise';
    criteria: string[];
    triggers: string[];
    pains: string[];
    valueHypotheses: string[];
    proofSources: string[];
  }>;
  useCases: string[];
  whyNow: string[];
}

export interface ContentTemplate {
  type: 'blog' | 'case_study' | 'whitepaper' | 'webinar' | 'docs' | 'email';
  requiredSections: string[];
  callToAction: string;
  proofRequirements: string[];
  reusePlan: string[];
}

export interface WebsiteKpiConfig {
  page: 'home' | 'pricing' | 'use_case' | 'security';
  metrics: Array<{
    name: string;
    target: number;
    description: string;
  }>;
  routing?: string[];
  abGuardrails?: string[];
}

export interface NurtureTrack {
  name: string;
  stage: 'new_lead' | 'engaged' | 'activated' | 'sql' | 'customer' | 'expansion';
  signals: string[];
  content: string[];
}

export interface EnablementAsset {
  role: 'sdr' | 'ae' | 'se' | 'csm';
  assetType: 'deck' | 'demo' | 'battlecard' | 'map' | 'objection_handling' | 'security_packet';
  required?: boolean;
  forbiddenPhrases?: string[];
}

export interface ChannelPlaybook {
  channel: 'paid_search' | 'content' | 'events' | 'partners' | 'outbound' | 'plg';
  cacTarget: number;
  paybackTargetMonths: number;
  killThreshold: number;
  attributionModel: 'multi_touch' | 'first_touch' | 'last_touch';
  complianceRequirements: string[];
}

export interface ExecutionChecklistItem {
  id: string;
  description: string;
  completed: boolean;
}

export interface EvidenceGraphLink {
  claimId: string;
  evidenceSource: string;
  channel: Channel;
  lastValidatedAt: string;
  driftDetected?: boolean;
}
