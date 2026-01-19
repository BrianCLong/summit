import { ChangeEvent } from './ChangeEvent.js';

export interface Projector {
  toNode(
    event: ChangeEvent
  ): { label: string; id: string; props: Record<string, unknown> } | null;

  toRels(
    event: ChangeEvent
  ): Array<{
    type: string;
    fromId: string;
    fromLabel?: string;
    toId: string;
    toLabel?: string;
    props?: Record<string, unknown>;
  }>;
}
