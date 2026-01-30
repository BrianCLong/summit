export type ImageRefType = 'screenshot' | 'photo' | 'diagram' | 'map' | 'unknown';

export interface ImageRef {
  id: string;
  type?: ImageRefType;
  altText?: string;
  detectedText?: string;
}

export interface ConversationContext {
  summary?: string;
  project?: string;
  priorEntities?: string[];
}

export interface ExplicitationInput {
  userText: string;
  imageRefs?: ImageRef[];
  conversationContext?: ConversationContext;
}

export interface UnknownSlot {
  slot: string;
  why_it_matters: string;
  ask_user_if_low_confidence: boolean;
}

export interface RetrievalPlanItem {
  source: 'graph' | 'kb' | 'web' | 'files';
  query: string;
}

export type AnswerStyle = 'checklist' | 'steps' | 'explanation';

export interface ExplicitationArtifact {
  explicit_query: string;
  intent: string;
  domain_guess: string;
  entities: string[];
  visual_evidence: string[];
  assumptions: string[];
  unknown_slots: UnknownSlot[];
  retrieval_plan: RetrievalPlanItem[];
  answer_style: AnswerStyle;
  imputed_intentions: string[];
  confidence: number;
  clarifying_question?: string;
}

export interface RetrievalGateInput {
  explicitation?: ExplicitationArtifact | null;
  governanceWaiver?: {
    waiverId: string;
    approvedBy: string;
    reason: string;
  };
}
