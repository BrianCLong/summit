export type MemoryScope = 'user' | 'project';

export type MemoryType =
  | 'project-config'
  | 'architecture'
  | 'error-solution'
  | 'preference'
  | 'learned-pattern'
  | 'conversation'
  | 'profile';

export interface MemoryMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

export interface MemoryRecord {
  id: string;
  tenantId: string;
  userId: string;
  scope: MemoryScope;
  projectId?: string;
  type: MemoryType;
  content: string;
  metadata?: MemoryMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemorySearchResult {
  record: MemoryRecord;
  score: number;
}

export interface MemorySearchInput {
  query: string;
  tenantId: string;
  userId: string;
  scope?: MemoryScope;
  projectId?: string;
  limit?: number;
  threshold?: number;
}

export interface MemoryAddInput {
  tenantId: string;
  userId: string;
  scope: MemoryScope;
  projectId?: string;
  type: MemoryType;
  content: string;
  metadata?: MemoryMetadata;
  id?: string;
}
