import { ChatMessage, LLMRequest, LLMResponse } from '../types.js';

export type ReasoningPaletteId = string;

export type PaletteInjectionKind = 'text_prefix' | 'soft_prefix';

export interface PaletteInjection {
  kind: PaletteInjectionKind;
  textPrefix?: string;
  softPrefixRef?: { adapterId: string; virtualTokens: number };
}

export interface ReasoningPalette {
  id: ReasoningPaletteId;
  label: string;
  description?: string;
  injection: PaletteInjection;
  decoding?: { temperature?: number; topP?: number };
  tags?: string[];
  safeDefault?: boolean;
}

export type PaletteSelectionStrategy =
  | { type: 'fixed'; id: ReasoningPaletteId }
  | { type: 'random'; allowedIds?: ReasoningPaletteId[]; weights?: number[]; seed?: number }
  | { type: 'policy'; ruleId: string; contextFields?: Record<string, unknown> }
  | {
      type: 'schedule';
      mode: 'linear_decay' | 'two_phase';
      pExploration: number;
      steps: number;
      seed?: number;
      phase1Exploration?: number;
    };

export interface PaletteRequestOptions {
  strategy?: PaletteSelectionStrategy;
  overrideId?: ReasoningPaletteId;
  k?: number;
  seed?: number;
}

export interface PaletteRuntimeConfig {
  enabled: boolean;
  defaultPaletteId: ReasoningPaletteId;
  allowExploration: boolean;
  maxK: number;
  allowedPaletteIds?: ReasoningPaletteId[];
  tenantAllowList?: Record<string, ReasoningPaletteId[]>;
}

export interface PaletteSelectionResult {
  palette: ReasoningPalette;
  strategyUsed: PaletteSelectionStrategy | null;
  injectionKind: PaletteInjectionKind;
  decodingApplied?: { temperature?: number; topP?: number };
}

export interface PaletteUsageRecord {
  paletteId: ReasoningPaletteId;
  strategy?: PaletteSelectionStrategy | null;
  injectionKind: PaletteInjectionKind;
  decoding?: { temperature?: number; topP?: number };
}

export interface PaletteCandidateSet {
  palette: ReasoningPalette;
  response?: LLMResponse;
  error?: Error;
}

export interface PaletteVerifierResult {
  selectedIndex: number;
  scores: Array<number | null>;
}

export interface PaletteVerifier {
  evaluate(candidates: PaletteCandidateSet[]): Promise<PaletteVerifierResult>;
}

export interface PalettePolicyContext {
  tenantId?: string;
  workspaceId?: string;
  highCompliance?: boolean;
}

export interface PaletteInjectionResult {
  messages: ChatMessage[];
  injectionKind: PaletteInjectionKind;
}

export type PaletteAwareRequest = LLMRequest & { palette?: PaletteRequestOptions; tenantId?: string };
