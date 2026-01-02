import { paletteAsPromptContent } from './injection.js';
import { PaletteCandidateSet, PaletteSelectionStrategy, ReasoningPalette } from './types.js';

export interface PaletteProvenanceEvent {
  paletteId: string;
  strategy?: PaletteSelectionStrategy | null;
  injectionKind: string;
  decoding?: { temperature?: number; topP?: number };
  candidates?: Array<{ paletteId: string; responseId?: string; error?: string }>;
  selectedIndex?: number;
  tenantId?: string;
  requestId?: string;
}

export class PaletteProvenanceRecorder {
  public events: PaletteProvenanceEvent[] = [];
  private ledger: any | null = null;

  async record(event: PaletteProvenanceEvent): Promise<void> {
    this.events.push(event);
    try {
      if (!this.ledger) {
        const module = await import('../../provenance/ledger.js');
        this.ledger = module.ProvenanceLedgerV2.getInstance();
      }
      await this.ledger.appendEntry({
        tenantId: event.tenantId || 'system',
        actionType: 'LLM_PALETTE_APPLIED',
        resourceType: 'ReasoningPalette',
        resourceId: event.paletteId,
        actorId: 'llm-router',
        actorType: 'system',
        timestamp: new Date(),
        payload: {
          mutationType: 'CREATE',
          entityId: event.paletteId,
          entityType: 'ReasoningPalette',
          diff: [],
          reason: 'llm_run',
          candidates: event.candidates,
          selectedIndex: event.selectedIndex,
        },
        metadata: {
          requestId: event.requestId,
          strategy: event.strategy,
          injectionKind: event.injectionKind,
          decoding: event.decoding,
          paletteId: event.paletteId,
        },
      });
    } catch (err: any) {
      // Fall back to console to avoid breaking runtime when ledger is unavailable
      console.warn('Failed to append palette provenance entry', err);
    }
  }
}

export function buildCandidateEvidence(candidates: PaletteCandidateSet[]): Array<{ paletteId: string; responseId?: string; error?: string }> {
  return candidates.map((c) => ({
    paletteId: c.palette.id,
    responseId: c.response?.id,
    error: c.error?.message,
  }));
}

export function capturePalettePrompt(palette: ReasoningPalette): string | undefined {
  return paletteAsPromptContent(palette.injection);
}
