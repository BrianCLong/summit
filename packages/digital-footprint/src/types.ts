/**
 * Types for digital footprint analysis
 */

export interface DigitalFootprint {
  entityId: string;
  usernames: UsernameRecord[];
  emails: EmailRecord[];
  phones: PhoneRecord[];
  ipAddresses: IPAddressRecord[];
  devices: DeviceRecord[];
  socialMedia: SocialMediaProfile[];
  domains: DomainRecord[];
  wallets: CryptoWalletRecord[];
  metadata: FootprintMetadata;
}

export interface FootprintMetadata {
  firstSeen: Date;
  lastSeen: Date;
  totalPlatforms: number;
  confidence: number;
  riskScore: number;
}

export interface UsernameRecord {
  username: string;
  platform: string;
  profileUrl?: string;
  verified: boolean;
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
}

export interface EmailRecord {
  email: string;
  type: 'personal' | 'work' | 'disposable' | 'unknown';
  domain: string;
  verified: boolean;
  breached: boolean;
  firstSeen: Date;
  confidence: number;
}

export interface PhoneRecord {
  phone: string;
  type: 'mobile' | 'landline' | 'voip' | 'unknown';
  country: string;
  carrier?: string;
  verified: boolean;
  firstSeen: Date;
  confidence: number;
}

export interface IPAddressRecord {
  ip: string;
  type: 'ipv4' | 'ipv6';
  geolocation: Geolocation;
  isp?: string;
  vpn: boolean;
  proxy: boolean;
  tor: boolean;
  firstSeen: Date;
  lastSeen: Date;
  connections: number;
}

export interface Geolocation {
  country: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface DeviceRecord {
  deviceId: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'iot' | 'unknown';
  os: string;
  browser?: string;
  fingerprint: string;
  firstSeen: Date;
  lastSeen: Date;
}

export interface SocialMediaProfile {
  platform: Platform;
  username: string;
  profileId?: string;
  profileUrl: string;
  displayName?: string;
  bio?: string;
  followers?: number;
  following?: number;
  posts?: number;
  verified: boolean;
  created?: Date;
  lastActive?: Date;
  confidence: number;
}

export type Platform =
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'github'
  | 'reddit'
  | 'tiktok'
  | 'youtube'
  | 'telegram'
  | 'discord'
  | 'mastodon'
  | 'other';

export interface DomainRecord {
  domain: string;
  registrar?: string;
  registrant?: string;
  registrationDate?: Date;
  expirationDate?: Date;
  nameservers?: string[];
  ipAddresses?: string[];
  relatedDomains: string[];
  confidence: number;
}

export interface CryptoWalletRecord {
  address: string;
  blockchain: string;
  type: 'hot' | 'cold' | 'exchange' | 'unknown';
  balance?: number;
  transactions?: number;
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
}

export interface FootprintAnalysis {
  footprint: DigitalFootprint;
  patterns: Pattern[];
  correlations: Correlation[];
  anomalies: Anomaly[];
  timeline: TimelineEvent[];
}

export interface Pattern {
  type: PatternType;
  description: string;
  confidence: number;
  evidence: string[];
}

export type PatternType =
  | 'username_reuse'
  | 'email_pattern'
  | 'timezone_pattern'
  | 'activity_pattern'
  | 'network_pattern'
  | 'linguistic_pattern';

export interface Correlation {
  type: string;
  entities: string[];
  strength: number;
  evidence: string[];
}

export interface Anomaly {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  details: Record<string, any>;
}

export interface TimelineEvent {
  timestamp: Date;
  type: string;
  platform?: string;
  description: string;
  metadata: Record<string, any>;
}

export interface CrossPlatformLink {
  platform1: string;
  platform2: string;
  linkType: 'username' | 'email' | 'phone' | 'ip' | 'device' | 'behavioral';
  confidence: number;
  evidence: string[];
}
