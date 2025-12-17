export type ClassificationTag = string;
export type PolicyTag = string;

export interface MemorySession {
  id: string;
  tenant_id: string;
  project_id?: string | null;
  environment?: string | null;
  classification: ClassificationTag[];
  policy_tags: PolicyTag[];
  title?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  agent_id?: string | null;
  status: 'active' | 'archived' | 'closed';
  origin_run_id?: string | null;
  metadata: Record<string, unknown>;
}

export interface MemoryPage {
  id: string;
  session_id: string;
  tenant_id: string;
  sequence: number;
  title?: string | null;
  raw_content: Record<string, unknown>;
  memo?: string | null;
  token_count?: number | null;
  actor_id?: string | null;
  actor_type?: string | null;
  source?: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  classification: ClassificationTag[];
  policy_tags: PolicyTag[];
  origin_run_id?: string | null;
  embedding?: number[] | null;
  metadata: Record<string, unknown>;
}

export interface MemoryEvent {
  id: string;
  page_id: string;
  session_id: string;
  tenant_id: string;
  sequence: number;
  type: string;
  actor_id?: string | null;
  actor_type?: string | null;
  content?: Record<string, unknown> | null;
  created_at: string;
  tags: string[];
  classification: ClassificationTag[];
  policy_tags: PolicyTag[];
  origin_run_id?: string | null;
  metadata: Record<string, unknown>;
}

export interface CreateSessionInput {
  tenantId: string;
  projectId?: string | null;
  environment?: string | null;
  classification?: ClassificationTag[];
  policyTags?: PolicyTag[];
  title?: string | null;
  description?: string | null;
  createdBy?: string | null;
  agentId?: string | null;
  status?: MemorySession['status'];
  originRunId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreatePageInput {
  sessionId: string;
  tenantId: string;
  sequence: number;
  title?: string | null;
  rawContent: Record<string, unknown>;
  memo?: string | null;
  tokenCount?: number | null;
  actorId?: string | null;
  actorType?: string | null;
  source?: string | null;
  tags?: string[];
  classification?: ClassificationTag[];
  policyTags?: PolicyTag[];
  originRunId?: string | null;
  embedding?: number[] | null;
  metadata?: Record<string, unknown>;
}

export interface CreateEventInput {
  pageId: string;
  sessionId: string;
  tenantId: string;
  sequence: number;
  type: string;
  actorId?: string | null;
  actorType?: string | null;
  content?: Record<string, unknown> | null;
  tags?: string[];
  classification?: ClassificationTag[];
  policyTags?: PolicyTag[];
  originRunId?: string | null;
  metadata?: Record<string, unknown>;
}
