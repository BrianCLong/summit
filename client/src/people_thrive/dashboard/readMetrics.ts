/**
 * Utility to read People Thrive metrics from evidence artifacts.
 * Ensures PII is never exposed to the UI layer.
 */

export interface ThriveMetrics {
  learning_objectives_count: number;
  resilience_objectives_count: number;
  incident_count_total: number;
  incident_resolution_rate: number;
  support_network_touchpoints: number;
}

export async function fetchAggregatedMetrics(): Promise<ThriveMetrics> {
  // In a real implementation, this would fetch from a secure API endpoint
  // that serves the contents of evidence/people_thrive/metrics.json
  const response = await fetch('/api/governance/people-thrive/metrics');
  if (!response.ok) {
    throw new Error('Failed to fetch culture metrics');
  }
  return response.json();
}
