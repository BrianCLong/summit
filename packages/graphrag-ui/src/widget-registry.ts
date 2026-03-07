// TODO: Needs full implementation after verification.

export interface WidgetRegistryEntry {
  type: string;
  allowedProps: string[];
}

export const WIDGET_REGISTRY: Record<string, WidgetRegistryEntry> = {
  "timeline": {
    type: "timeline",
    allowedProps: ["events", "range"]
  },
  "entity-card": {
    type: "entity-card",
    allowedProps: ["entityId", "summary"]
  },
  "graph-view": {
    type: "graph-view",
    allowedProps: ["nodes", "edges"]
  }
};

export function isWidgetAllowed(type: string, policyAllowlist: string[]): boolean {
  return policyAllowlist.includes(type) && type in WIDGET_REGISTRY;
}
