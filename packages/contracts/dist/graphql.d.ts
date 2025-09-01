export type EntityID = string;
export type InvestigationID = string;
export interface Entity {
    id: EntityID;
    type: string;
    value: string;
    confidence?: number;
    source?: string;
    firstSeen?: string;
    lastSeen?: string;
    properties?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}
export interface Relationship {
    id: string;
    source: EntityID;
    target: EntityID;
    type: string;
    label?: string;
    confidence?: number;
    properties?: Record<string, unknown>;
}
