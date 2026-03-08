"use strict";
/**
 * API client for narrative simulation visualization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSimulationArcs = getSimulationArcs;
exports.getSimulationEvents = getSimulationEvents;
exports.getSimulationSummary = getSimulationSummary;
exports.getSimulationVisualizationData = getSimulationVisualizationData;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
/**
 * Fetch arc data for a simulation
 */
async function getSimulationArcs(simId) {
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
async function getSimulationEvents(simId) {
    const response = await fetch(`${API_BASE}/api/narrative/${simId}/events`, {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch simulation events: ${response.statusText}`);
    }
    return response.json();
}
/**
 * Fetch summary for a simulation
 */
async function getSimulationSummary(simId) {
    const response = await fetch(`${API_BASE}/api/narrative/${simId}/summary`, {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch simulation summary: ${response.statusText}`);
    }
    return response.json();
}
/**
 * Combined fetch for arc and event data
 */
async function getSimulationVisualizationData(simId) {
    const [arcs, events, summary] = await Promise.all([
        getSimulationArcs(simId),
        getSimulationEvents(simId),
        getSimulationSummary(simId),
    ]);
    return { arcs, events, summary };
}
