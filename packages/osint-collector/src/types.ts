export interface OsintSource {
  id: string;
  name: string;
  url: string;
  type: 'social_media' | 'news' | 'forum' | 'dark_web' | 'government' | 'academic';
  config: Record<string, any>;
  lastSync?: Date;
  status: 'active' | 'inactive' | 'error';
  tags: string[];
  tenantId: string;
}

export interface OsintCollectionTask {
  id: string;
  sourceId: string;
  query: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results?: any[];
  error?: string;
  tenantId: string;
}

export interface CollectionResult {
  id: string;
  sourceId: string;
  collectedAt: Date;
  content: string;
  metadata: Record<string, any>;
  entities: string[];
  relationships: string[];
  tags: string[];
  tenantId: string;
}