/**
 * API client for narrative simulation visualization
 */

import type {
    SimulationArcData,
    SimulationEventData,
    SimulationSummary,
} from './types/narrative-viz-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Fetch arc data for a simulation
 */
export async function getSimulationArcs(
    simId: string,
): Promise<SimulationArcData> {
    const response = await fetch(`${API_BASE}/api/narrative/${simId}/arcs`, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch simulation arcs: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch events for a simulation
 */
export async function getSimulationEvents(
    simId: string,
): Promise<SimulationEventData> {
    const response = await fetch(`${API_BASE}/api/narrative/${simId}/events`, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(
            `Failed to fetch simulation events: ${response.statusText}`,
        );
    }

    return response.json();
}

/**
 * Fetch summary for a simulation
 */
export async function getSimulationSummary(
    simId: string,
): Promise<SimulationSummary> {
    const response = await fetch(`${API_BASE}/api/narrative/${simId}/summary`, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(
            `Failed to fetch simulation summary: ${response.statusText}`,
        );
    }

    return response.json();
}

/**
 * Combined fetch for arc and event data
 */
export async function getSimulationVisualizationData(simId: string): Promise<{
    arcs: SimulationArcData;
    events: SimulationEventData;
    summary: SimulationSummary;
}> {
    const [arcs, events, summary] = await Promise.all([
        getSimulationArcs(simId),
        getSimulationEvents(simId),
        getSimulationSummary(simId),
    ]);

    return { arcs, events, summary };
}
