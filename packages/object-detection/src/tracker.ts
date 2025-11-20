/**
 * Multi-Object Tracking (MOT) Implementation
 */

import {
  Detection,
  BoundingBox,
  calculateIoU,
  getBboxCenter,
} from '@intelgraph/computer-vision';
import {
  TrackedObject,
  TrackingResult,
  MOTConfig,
} from './types.js';

/**
 * Simple Object Tracker using IoU matching
 * Based on SORT (Simple Online and Realtime Tracking)
 */
export class ObjectTracker {
  private config: MOTConfig;
  private tracks: Map<number, TrackedObject>;
  private nextTrackId: number = 1;
  private frameId: number = 0;

  constructor(config: Partial<MOTConfig> = {}) {
    this.config = {
      tracker_type: config.tracker_type || 'sort',
      max_age: config.max_age || 30,
      min_hits: config.min_hits || 3,
      iou_threshold: config.iou_threshold || 0.3,
      use_embeddings: config.use_embeddings || false,
      embedding_model: config.embedding_model,
    };

    this.tracks = new Map();
  }

  /**
   * Update tracks with new detections
   */
  update(detections: Detection[]): TrackingResult {
    this.frameId++;

    const newTracks: number[] = [];
    const lostTracks: number[] = [];

    // Match detections to existing tracks
    const { matched, unmatched } = this.matchDetectionsToTracks(detections);

    // Update matched tracks
    for (const [trackId, detection] of matched) {
      this.updateTrack(trackId, detection);
    }

    // Create new tracks for unmatched detections
    for (const detection of unmatched) {
      const trackId = this.createTrack(detection);
      newTracks.push(trackId);
    }

    // Update age for all tracks and remove old ones
    for (const [trackId, track] of this.tracks.entries()) {
      track.time_since_update++;

      // Remove tracks that are too old
      if (track.time_since_update > this.config.max_age) {
        this.tracks.delete(trackId);
        lostTracks.push(trackId);
      }
    }

    // Get active tracks (with minimum hits)
    const activeTrackedObjects = Array.from(this.tracks.values()).filter(
      (track) => track.hits >= this.config.min_hits
    );

    return {
      frame_id: this.frameId,
      tracked_objects: activeTrackedObjects,
      new_tracks: newTracks,
      lost_tracks: lostTracks,
      active_tracks: activeTrackedObjects.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Match detections to existing tracks using IoU
   */
  private matchDetectionsToTracks(
    detections: Detection[]
  ): {
    matched: Map<number, Detection>;
    unmatched: Detection[];
  } {
    const matched = new Map<number, Detection>();
    const unmatchedDetections = new Set(detections);

    // Create cost matrix (IoU-based)
    const tracks = Array.from(this.tracks.entries());
    const costMatrix: number[][] = [];

    for (const [trackId, track] of tracks) {
      const costs: number[] = [];
      for (const detection of detections) {
        const iou = calculateIoU(track.detection.bbox, detection.bbox);
        costs.push(1 - iou); // Convert IoU to cost (lower is better)
      }
      costMatrix.push(costs);
    }

    // Simple greedy matching
    const assignments = this.greedyAssignment(costMatrix, 1 - this.config.iou_threshold);

    // Process assignments
    for (const [trackIdx, detectionIdx] of assignments.entries()) {
      if (detectionIdx !== -1) {
        const [trackId] = tracks[trackIdx];
        const detection = detections[detectionIdx];
        matched.set(trackId, detection);
        unmatchedDetections.delete(detection);
      }
    }

    return {
      matched,
      unmatched: Array.from(unmatchedDetections),
    };
  }

  /**
   * Greedy assignment algorithm
   */
  private greedyAssignment(
    costMatrix: number[][],
    costThreshold: number
  ): Map<number, number> {
    const assignments = new Map<number, number>();
    const usedDetections = new Set<number>();

    for (let trackIdx = 0; trackIdx < costMatrix.length; trackIdx++) {
      const costs = costMatrix[trackIdx];
      let minCost = Infinity;
      let minIdx = -1;

      for (let detIdx = 0; detIdx < costs.length; detIdx++) {
        if (!usedDetections.has(detIdx) && costs[detIdx] < minCost) {
          minCost = costs[detIdx];
          minIdx = detIdx;
        }
      }

      if (minCost <= costThreshold && minIdx !== -1) {
        assignments.set(trackIdx, minIdx);
        usedDetections.add(minIdx);
      } else {
        assignments.set(trackIdx, -1);
      }
    }

    return assignments;
  }

  /**
   * Create a new track
   */
  private createTrack(detection: Detection): number {
    const trackId = this.nextTrackId++;

    const track: TrackedObject = {
      track_id: trackId,
      detection,
      trajectory: [detection.bbox],
      velocity: { x: 0, y: 0 },
      age: 1,
      time_since_update: 0,
      hits: 1,
    };

    this.tracks.set(trackId, track);
    return trackId;
  }

  /**
   * Update an existing track
   */
  private updateTrack(trackId: number, detection: Detection): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    // Calculate velocity
    const oldCenter = getBboxCenter(track.detection.bbox);
    const newCenter = getBboxCenter(detection.bbox);
    track.velocity = {
      x: newCenter.x - oldCenter.x,
      y: newCenter.y - oldCenter.y,
    };

    // Update track
    track.detection = detection;
    track.trajectory.push(detection.bbox);
    track.age++;
    track.time_since_update = 0;
    track.hits++;

    // Limit trajectory length
    if (track.trajectory.length > 100) {
      track.trajectory = track.trajectory.slice(-100);
    }
  }

  /**
   * Get track by ID
   */
  getTrack(trackId: number): TrackedObject | undefined {
    return this.tracks.get(trackId);
  }

  /**
   * Get all active tracks
   */
  getActiveTracks(): TrackedObject[] {
    return Array.from(this.tracks.values()).filter(
      (track) => track.hits >= this.config.min_hits && track.time_since_update === 0
    );
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.tracks.clear();
    this.nextTrackId = 1;
    this.frameId = 0;
  }

  /**
   * Get tracking statistics
   */
  getStats(): {
    total_tracks: number;
    active_tracks: number;
    frame_id: number;
  } {
    const activeTracks = this.getActiveTracks();
    return {
      total_tracks: this.tracks.size,
      active_tracks: activeTracks.length,
      frame_id: this.frameId,
    };
  }
}

/**
 * ByteTrack implementation (advanced tracker)
 */
export class ByteTracker extends ObjectTracker {
  constructor(config: Partial<MOTConfig> = {}) {
    super({
      ...config,
      tracker_type: 'bytetrack',
    });
  }

  /**
   * Update with high/low confidence detections
   */
  updateWithConfidence(
    detections: Detection[],
    highThreshold: number = 0.6,
    lowThreshold: number = 0.3
  ): TrackingResult {
    // Separate detections by confidence
    const highConfDetections = detections.filter((d) => d.confidence >= highThreshold);
    const lowConfDetections = detections.filter(
      (d) => d.confidence >= lowThreshold && d.confidence < highThreshold
    );

    // First match with high confidence detections
    const result = this.update(highConfDetections);

    // Then try to match remaining tracks with low confidence detections
    // This is a simplified version - full ByteTrack is more complex
    const unmatchedTracks = Array.from(this.tracks.values()).filter(
      (track) => track.time_since_update > 0
    );

    for (const track of unmatchedTracks) {
      for (const detection of lowConfDetections) {
        const iou = calculateIoU(track.detection.bbox, detection.bbox);
        if (iou >= this.config.iou_threshold) {
          this.updateTrack(track.track_id, detection);
          break;
        }
      }
    }

    return result;
  }
}

/**
 * Create tracker instance
 */
export function createTracker(
  type: 'sort' | 'bytetrack' = 'sort',
  config?: Partial<MOTConfig>
): ObjectTracker {
  if (type === 'bytetrack') {
    return new ByteTracker(config);
  }
  return new ObjectTracker(config);
}
