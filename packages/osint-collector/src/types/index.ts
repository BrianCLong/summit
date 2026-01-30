/**
 * Type definitions for OSINT collection framework
 */

export interface CollectionTask {
  id: string;
  type: CollectionType;
  source: string;
  target: string;
  priority: number;
  scheduledAt: Date;
  status: TaskStatus;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export enum CollectionType {
  SOCIAL_MEDIA = 'social_media',
  WEB_SCRAPING = 'web_scraping',
  RSS_FEED = 'rss_feed',
  PUBLIC_RECORDS = 'public_records',
  DOMAIN_INTEL = 'domain_intel',
  DARK_WEB = 'dark_web',
  FORUM = 'forum',
  NEWS = 'news',
  IMAGE_METADATA = 'image_metadata',
  GEOLOCATION = 'geolocation'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface CollectionResult {
  taskId: string;
  source: string;
  collectedAt: Date;
  data: unknown;
  metadata: {
    duration: number;
    recordCount: number;
    errors?: string[];
  };
}

export interface CollectorConfig {
  name: string;
  type: CollectionType;
  enabled: boolean;
  rateLimit?: {
    requests: number;
    period: number; // milliseconds
  };
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoff: 'linear' | 'exponential';
    initialDelay: number;
  };
  authentication?: {
    type: 'api_key' | 'oauth' | 'basic' | 'token';
    credentials: Record<string, string>;
  };
}

export interface SocialMediaProfile {
  platform: string;
  username: string;
  displayName?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  postsCount?: number;
  verified?: boolean;
  profileUrl: string;
  avatarUrl?: string;
  createdAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface DomainIntelligence {
  domain: string;
  registrar?: string;
  registrationDate?: Date;
  expirationDate?: Date;
  nameservers?: string[];
  ipAddresses?: string[];
  contactInfo?: {
    registrant?: string;
    admin?: string;
    technical?: string;
  };
  dnsRecords?: Record<string, string[]>;
  sslCertificate?: {
    issuer: string;
    validFrom: Date;
    validTo: Date;
    subject: string;
  };
}

export interface PublicRecord {
  type: string;
  source: string;
  title: string;
  content: string;
  url?: string;
  date?: Date;
  entities?: string[];
  metadata?: Record<string, unknown>;
}
