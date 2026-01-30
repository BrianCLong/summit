
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

export interface OSINTProfile extends Entity {
  kind: 'person' | 'organization'; // Restricting to these for now
  socialProfiles: SocialMediaProfile[];
  corporateRecords: CorporateRecord[];
  publicRecords: PublicRecord[];
  confidenceScore: number;
  lastEnrichedAt: string;
}

export interface OSINTEnrichmentResult {
  source: string;
  data: SocialMediaProfile | CorporateRecord | PublicRecord | null;
  confidence: number;
}
