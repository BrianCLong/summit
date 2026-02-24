
import { Entity, EntityKind } from '../data-model/types';

export interface SocialMediaProfile {
  platform: 'twitter' | 'linkedin' | 'facebook' | 'github' | 'instagram';
  username: string;
  url: string;
  displayName?: string;
  bio?: string;
  followersCount?: number;
  lastActive?: string;
}

export interface CorporateRecord {
  companyName: string;
  registrationNumber?: string;
  jurisdiction?: string;
  incorporationDate?: string;
  status?: 'active' | 'dissolved' | 'inactive';
  officers?: Array<{ name: string; role: string }>;
  address?: string;
}

export interface PublicRecord {
  source: string;
  recordType: 'court_filing' | 'property_deed' | 'voting_record' | 'other';
  date: string;
  details: Record<string, any>;
}

/**
 * Represents a discrete assertion about an entity, independent of the source profile.
 * Introduced in Automation Turn #5 (Claim-Centric Validation).
 */
export interface Claim {
  id: string;
  sourceId: string;
  subject: string;
  predicate: string;
  object: any;
  confidence: number;
  timestamp: string;
  validFrom?: string;
  validTo?: string;
  verificationHistory?: VerificationResult[];
}

export interface VerificationResult {
  verifierId: string;
  timestamp: string;
  status: 'confirmed' | 'refuted' | 'uncertain';
  confidenceDelta: number;
  evidence?: string[];
}

export interface Contradiction {
  id: string;
  claimIdA: string;
  claimIdB: string;
  reason: string;
  detectedAt: string;
  severity: 'low' | 'medium' | 'high';
}

export interface OSINTProfile extends Entity {
  kind: 'person' | 'organization'; // Restricting to these for now
  socialProfiles: SocialMediaProfile[];
  corporateRecords: CorporateRecord[];
  publicRecords: PublicRecord[];
  confidenceScore: number;
  lastEnrichedAt: string;
  claims?: Claim[]; // New in Turn #5
  contradictions?: Contradiction[]; // New in Turn #5
}

export interface OSINTEnrichmentResult {
  source: string;
  data: SocialMediaProfile | CorporateRecord | PublicRecord | null;
  confidence: number;
}
