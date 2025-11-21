/**
 * Base classes and types for election disruption detection
 */

import type {
  ElectionContext,
  ElectionThreatSignal,
  RawSignal,
} from '../types.js';

/**
 * Abstract base class for threat detectors
 */
export abstract class ThreatDetector {
  abstract analyze(
    signals: RawSignal[],
    context: ElectionContext
  ): Promise<ElectionThreatSignal[]>;
}
