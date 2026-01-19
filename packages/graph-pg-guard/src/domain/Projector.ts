import type { ChangeEvent } from './ChangeEvent';

export interface Projector {
  // Map a row to a node label + properties
  toNode(event: ChangeEvent): { label: string; id: string; props: Record<string, unknown> } | null;
  // Map FK-like columns to relationship edges
  toRels(event: ChangeEvent): Array<{ type: string; fromId: string; toId: string; props?: Record<string, unknown> }>;
}
