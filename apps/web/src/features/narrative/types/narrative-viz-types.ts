/**
 * Type definitions for narrative visualization components
 */

export type NarrativeEventType =
    | 'social'
    | 'political'
    | 'information'
    | 'intervention'
    | 'system'
    | 'suppression';

export type ArcOutlook = 'improving' | 'degrading' | 'steady';

export interface ArcDataPoint {
    theme: string;
    momentum: number;
    outlook: ArcOutlook;
    confidence: number;
    keyEntities: string[];
    narrative: string;
}

export interface EventMarker {
    id: string;
    tick: number;
    type: NarrativeEventType;
    actorId?: string;
    targetIds?: string[];
    theme: string;
    intensity: number;
    description: string;
    metadata?: Record<string, unknown>;
}

export interface SimulationArcData {
    simulationId: string;
    currentTick: number;
    arcs: ArcDataPoint[];
    history: Array<{
        tick: number;
        arcs: ArcDataPoint[];
    }>;
}

export interface SimulationEventData {
    simulationId: string;
    currentTick: number;
    events: EventMarker[];
}

export interface SimulationSummary {
    id: string;
    name: string;
    tick: number;
    themes: string[];
    entityCount: number;
    arcCount: number;
    recentEventCount: number;
    narrative: {
        mode: 'rule-based' | 'llm';
        summary: string;
        highlights: Array<{
            theme: string;
            text: string;
        }>;
        risks: string[];
        opportunities: string[];
    };
}

export interface ChartConfig {
    themes: string[];
    colors: Record<string, string>;
    showEvents: boolean;
    timeRange?: [number, number];
}

/**
 * Default theme colors for narrative arcs
 */
export const DEFAULT_THEME_COLORS: Record<string, string> = {
    Security: '#ef4444', // red-500
    Trust: '#3b82f6', // blue-500
    Fear: '#8b5cf6', // violet-500
    Hope: '#10b981', // emerald-500
    Anger: '#f59e0b', // amber-500
    Unity: '#06b6d4', // cyan-500
    Division: '#ec4899', // pink-500
    Progress: '#14b8a6', // teal-500
    Tradition: '#f97316', // orange-500
    Innovation: '#6366f1', // indigo-500
};

/**
 * Event type colors for markers
 */
export const EVENT_TYPE_COLORS: Record<NarrativeEventType, string> = {
    social: '#3b82f6', // blue
    political: '#ef4444', // red
    information: '#8b5cf6', // violet
    intervention: '#f59e0b', // amber
    system: '#6b7280', // gray
    suppression: '#dc2626', // red-600
};
