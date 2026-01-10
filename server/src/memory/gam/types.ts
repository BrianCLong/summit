import { MemoryPage, MemorySession } from '../types.js';

export type RetrieverType = 'bm25' | 'dense' | 'page_id';

export interface GamTurn {
  role: string;
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestSessionRequest {
  tenantId: string;
  agentId?: string | null;
  sessionId?: string | null;
  title?: string | null;
  description?: string | null;
  classification?: string[];
  policyTags?: string[];
  metadata?: Record<string, unknown>;
  turns: GamTurn[];
}

export interface BudgetOptions {
  maxPages?: number;
  maxReflectionDepth?: number;
  maxOutputTokens?: number;
}

export interface BuildContextRequest {
  tenantId: string;
  agentId?: string | null;
  sessionId?: string | null;
  request: string;
  budgets?: BudgetOptions;
  mode?: 'brief' | 'full';
}

export interface DecoratedHeader {
  sessionId: string;
  tenantId: string;
  agentId?: string | null;
  sequence: number;
  createdAt: string;
  memoSnapshot?: string;
  tags?: string[];
  classification?: string[];
  policyTags?: string[];
  originRunId?: string | null;
  requestIntent?: string | null;
}

export interface DecoratedPage {
  page: MemoryPage;
  header: DecoratedHeader;
}

export interface PlanAction {
  tool: RetrieverType;
  query?: string;
  pageIds?: string[];
  k: number;
  note?: string;
}

export interface RetrievalResult {
  pageId: string;
  sessionId: string;
  tenantId: string;
  score: number;
  retrieverType: RetrieverType;
  excerpt: string;
  memo?: string | null;
}

export interface IntegrationState {
  briefingDraft: string;
  keyFacts: string[];
  openQuestions: string[];
  usedPages: string[];
}

export interface ReflectionDecision {
  done: boolean;
  missingInfo?: string;
}

export interface BriefingContext {
  executiveSummary: string;
  keyFacts: string[];
  openQuestions: string[];
  evidence: Array<{
    pageId: string;
    excerpt: string;
    relevanceScore: number;
    retrieverType: RetrieverType;
  }>;
  tokensUsed: number;
  reflectionSteps: number;
  pagesUsed: number;
}

export interface IngestResponse {
  session: MemorySession;
  memo: string;
  pages: DecoratedPage[];
}
