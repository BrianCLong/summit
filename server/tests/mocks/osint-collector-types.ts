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

export interface CollectorConfig {
  name: string;
  type: CollectionType;
  enabled: boolean;
  rateLimit?: {
    requests: number;
    period: number;
  };
  timeout?: number;
}
