import { TrafficFlow, TrafficFeatures, TrafficAnomalyResult } from './traffic-types.ts';

// Helper math functions since we might not have them imported
function localMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function medianAbsoluteDeviation(values: number[], med: number): number {
  if (!values.length) return 0;
  const deviations = values.map((value) => Math.abs(value - med));
  return localMedian(deviations);
}

function robustZ(value: number, med: number, mad: number): number {
  return mad ? Math.abs(value - med) / (1.4826 * mad) : 0;
}

function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

export class TrafficEngine {

  /**
   * Extracts numerical features from a raw traffic flow for ML analysis
   */
  extractFeatures(flow: TrafficFlow): TrafficFeatures {
    let duration = Math.max(flow.endTime - flow.startTime, 0);
    // Handle 0 duration flows (single packet or sub-millisecond)
    if (duration === 0) {
        duration = 0.001;
    }

    return {
      flowId: flow.flowId,
      duration,
      bytesPerPacket: flow.packets > 0 ? flow.bytes / flow.packets : 0,
      packetsPerSecond: flow.packets / duration,
      bytesPerSecond: flow.bytes / duration,
      tcpFlagCount: flow.flags ? flow.flags.length : 0,
      isEphemeralPort: flow.sourcePort > 1024
    };
  }

  /**
   * Basic heuristic checks for known attack patterns
   */
  checkHeuristics(flow: TrafficFlow): TrafficAnomalyResult | null {
    // Protocol Analysis: Check for suspicious payloads
    if (flow.payloadHints) {
        const suspicious = ['union select', 'eval(', '/etc/passwd', 'alert(1)'];
        for (const hint of flow.payloadHints) {
            for (const pattern of suspicious) {
                if (hint.toLowerCase().includes(pattern)) {
                    return {
                        isAnomaly: true,
                        score: 0.95,
                        type: 'PROTOCOL',
                        confidence: 0.9,
                        details: `Suspicious payload detected: ${pattern}`
                    };
                }
            }
        }
    }

    // Protocol Analysis: Invalid TCP flag combinations
    if (flow.protocol === 'TCP' && flow.flags) {
        if (flow.flags.includes('SYN') && flow.flags.includes('FIN')) {
             return {
                isAnomaly: true,
                score: 0.9,
                type: 'PROTOCOL',
                confidence: 0.85,
                details: 'Invalid TCP flags: SYN+FIN'
            };
        }
    }

    // Simple DDoS heuristic (Volumetric)
    // Thresholds would normally be dynamic, but hardcoding for MVP
    let duration = (flow.endTime - flow.startTime);
    if (duration <= 0) duration = 0.001; // Avoid div by zero

    const pps = flow.packets / duration;
    if (pps > 10000) { // Extremely high PPS
        return {
            isAnomaly: true,
            score: 0.9,
            type: 'DDOS',
            confidence: 0.8,
            details: `High packet rate: ${pps.toFixed(2)} pps`
        };
    }

    return null;
  }

  /**
   * Batch analysis using Isolation Forest logic adapted for traffic
   * This detects outliers in the current batch of traffic
   */
  detectBatchAnomalies(flows: TrafficFlow[], contamination = 0.05): Map<string, TrafficAnomalyResult> {
    const results = new Map<string, TrafficAnomalyResult>();
    if (flows.length === 0) return results;

    const featuresList = flows.map(f => this.extractFeatures(f));

    // Arrays for metrics
    const durations = featuresList.map(f => f.duration);
    const bpp = featuresList.map(f => f.bytesPerPacket);
    const pps = featuresList.map(f => f.packetsPerSecond);
    const bps = featuresList.map(f => f.bytesPerSecond);

    // Medians
    const durationMed = localMedian(durations);
    const bppMed = localMedian(bpp);
    const ppsMed = localMedian(pps);
    const bpsMed = localMedian(bps);

    // MADs
    const durationMad = medianAbsoluteDeviation(durations, durationMed);
    const bppMad = medianAbsoluteDeviation(bpp, bppMed);
    const ppsMad = medianAbsoluteDeviation(pps, ppsMed);
    const bpsMad = medianAbsoluteDeviation(bps, bpsMed);

    // Calculate scores
    const scoredFeatures = featuresList.map((f, idx) => {
        const zDuration = robustZ(f.duration, durationMed, durationMad);
        const zBpp = robustZ(f.bytesPerPacket, bppMed, bppMad);
        const zPps = robustZ(f.packetsPerSecond, ppsMed, ppsMad);
        const zBps = robustZ(f.bytesPerSecond, bpsMed, bpsMad);

        // Simple average of Z-scores as anomaly score
        const score = (zDuration + zBpp + zPps + zBps) / 4;

        return { flowId: f.flowId, score, zPps, zBps, zBpp, zDuration };
    });

    // Determine threshold
    const scores = scoredFeatures.map(s => s.score);
    const threshold = quantile(scores, 1 - contamination);

    scoredFeatures.forEach(s => {
        // Run heuristics first as they are specific
        const flow = flows.find(f => f.flowId === s.flowId)!;
        const heuristicResult = this.checkHeuristics(flow);

        if (heuristicResult) {
            results.set(s.flowId, heuristicResult);
            return;
        }

        // ML detection
        if (s.score > threshold && s.score > 2.0) { // Require min Z-score of 2
            let type: 'DDOS' | 'BOTNET' | 'UNKNOWN' = 'UNKNOWN';
            let details = `Statistical anomaly (Score: ${s.score.toFixed(2)})`;

            if (s.zPps > 3 || s.zBps > 3) {
                type = 'DDOS';
                details = `Volumetric anomaly (PPS/BPS spike)`;
            } else if (s.zDuration > 3 && s.zBpp < 0.5) {
                // Long duration, small packets -> slow loris / beaconing?
                type = 'BOTNET';
                details = `Traffic pattern anomaly (Beaconing/SlowLoris)`;
            }

            results.set(s.flowId, {
                isAnomaly: true,
                score: Math.min(s.score / 10, 1), // Normalize roughly
                type,
                confidence: 0.6 + (Math.min(s.score, 10) / 25), // heuristic confidence
                details
            });
        }
    });

    // Post-process: Botnet detection (Coordinated behavior)
    // Check for multiple source IPs targeting same Dest IP/Port in this batch
    this.detectCoordinatedAttacks(flows, results);

    return results;
  }

  private detectCoordinatedAttacks(flows: TrafficFlow[], results: Map<string, TrafficAnomalyResult>) {
    const targetCounts = new Map<string, Set<string>>(); // target -> Set<sourceIp>

    for (const flow of flows) {
        const key = `${flow.destIp}:${flow.destPort}`;
        if (!targetCounts.has(key)) targetCounts.set(key, new Set());
        targetCounts.get(key)!.add(flow.sourceIp);
    }

    for (const [target, sources] of targetCounts.entries()) {
        if (sources.size > 5) { // Threshold: > 5 unique IPs targeting same service in one batch
            // Mark all flows to this target as suspicious if they aren't already
             for (const flow of flows) {
                if (`${flow.destIp}:${flow.destPort}` === target) {
                    const existing = results.get(flow.flowId);
                    if (!existing) {
                         results.set(flow.flowId, {
                            isAnomaly: true,
                            score: 0.7,
                            type: 'BOTNET',
                            confidence: 0.75,
                            details: `Coordinated traffic: ${sources.size} sources targeting ${target}`
                        });
                    } else if (existing.type === 'UNKNOWN') {
                        existing.type = 'BOTNET';
                        existing.details += ` + Coordinated traffic`;
                    }
                }
             }
        }
    }
  }
}
