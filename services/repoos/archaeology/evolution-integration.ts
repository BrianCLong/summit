/**
 * Evolution Intelligence Integration
 *
 * Connects Repository Archaeology Engine with Evolution Intelligence System:
 * - Archaeology events feed into Evolution Ledger
 * - Deletion detection triggers homeostasis checks
 * - Reconstruction success tracked as evolution events
 * - Capability graph informs merge risk prediction
 *
 * Integration Points:
 * 1. Fragment extraction → Evolution event (CODE_FRAGMENT_EXTRACTED)
 * 2. Deletion detection → Evolution event (CAPABILITY_DELETED)
 * 3. Reconstruction success → Evolution event (CAPABILITY_RESURRECTED)
 * 4. Subsystem inference → Repository health signal
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CodeFragment } from './fragment-extractor.js';
import type { DeletionCandidate } from './partial-deletion-detector.js';
import type { ReconstructionBundle } from './reconstruction-engine.js';
import type { CapabilityGraph } from './capability-graph.js';

/**
 * Evolution Event Types
 */
export type EvolutionEventType =
  | 'FRAGMENT_EXTRACTED'
  | 'SUBSYSTEM_INFERRED'
  | 'CAPABILITY_DELETED'
  | 'DELETION_DETECTED'
  | 'RECONSTRUCTION_STARTED'
  | 'RECONSTRUCTION_SUCCESS'
  | 'RECONSTRUCTION_FAILED'
  | 'CAPABILITY_RESURRECTED'
  | 'GRAPH_UPDATED';

/**
 * Evolution Event
 */
export interface EvolutionEvent {
  id: string;
  type: EvolutionEventType;
  timestamp: string; // ISO 8601
  source: 'archaeology_engine';
  payload: Record<string, any>;
  metadata: {
    repo_path: string;
    commit_sha?: string;
    correlation_id?: string; // Links related events
  };
}

/**
 * Homeostasis Signal
 */
export interface HomeostasisSignal {
  signal_type: 'capability_health' | 'deletion_risk' | 'resurrection_opportunity';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metrics: Record<string, number>;
  recommended_action?: string;
  timestamp: string;
}

/**
 * Integration Configuration
 */
export interface EvolutionIntegrationConfig {
  repo_path: string;
  evolution_ledger_path: string; // Where to append evolution events
  homeostasis_signals_path: string; // Where to send health signals
  enable_auto_resurrection?: boolean; // Automatically trigger resurrection
  deletion_alert_threshold?: number; // Deletion count that triggers alert
}

/**
 * Evolution Integration Bridge
 */
export class EvolutionIntegration {
  private config: Required<EvolutionIntegrationConfig>;
  private events: EvolutionEvent[] = [];

  constructor(config: EvolutionIntegrationConfig) {
    this.config = {
      repo_path: config.repo_path,
      evolution_ledger_path: config.evolution_ledger_path,
      homeostasis_signals_path: config.homeostasis_signals_path,
      enable_auto_resurrection: config.enable_auto_resurrection ?? false,
      deletion_alert_threshold: config.deletion_alert_threshold || 5,
    };
  }

  /**
   * Record fragment extraction event
   */
  async recordFragmentExtraction(fragments: CodeFragment[]): Promise<void> {
    console.log(`Evolution Integration: Recording ${fragments.length} fragments...`);

    const deletedCount = fragments.filter((f) => f.deletion_info).length;

    const event: EvolutionEvent = {
      id: this.generateEventId(),
      type: 'FRAGMENT_EXTRACTED',
      timestamp: new Date().toISOString(),
      source: 'archaeology_engine',
      payload: {
        total_fragments: fragments.length,
        deleted_fragments: deletedCount,
        active_fragments: fragments.length - deletedCount,
        categories: this.countFragmentCategories(fragments),
        avg_complexity: this.calculateAvgComplexity(fragments),
      },
      metadata: {
        repo_path: this.config.repo_path,
      },
    };

    await this.appendEvent(event);

    // Check if deletion count warrants alert
    if (deletedCount >= this.config.deletion_alert_threshold) {
      await this.sendHomeostasisSignal({
        signal_type: 'deletion_risk',
        severity: deletedCount > 20 ? 'critical' : 'warning',
        message: `High deletion count detected: ${deletedCount} fragments deleted`,
        metrics: {
          deleted_count: deletedCount,
          deletion_percentage: (deletedCount / fragments.length) * 100,
        },
        recommended_action: 'Review deletion candidates for resurrection opportunities',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`  ✅ Fragment extraction event recorded`);
  }

  /**
   * Record deletion detection event
   */
  async recordDeletionDetection(candidates: DeletionCandidate[]): Promise<void> {
    console.log(`Evolution Integration: Recording ${candidates.length} deletion candidates...`);

    const resurrectCount = candidates.filter(
      (c) => c.recommendation === 'resurrect_immediately' || c.recommendation === 'resurrect_soon'
    ).length;

    const highValueCount = candidates.filter((c) => c.business_value.value_score >= 0.7).length;

    const event: EvolutionEvent = {
      id: this.generateEventId(),
      type: 'DELETION_DETECTED',
      timestamp: new Date().toISOString(),
      source: 'archaeology_engine',
      payload: {
        total_candidates: candidates.length,
        resurrect_recommended: resurrectCount,
        high_value_deletions: highValueCount,
        by_recommendation: this.countByRecommendation(candidates),
        avg_value_score: this.calculateAvgValueScore(candidates),
      },
      metadata: {
        repo_path: this.config.repo_path,
      },
    };

    await this.appendEvent(event);

    // Send resurrection opportunity signal if high-value deletions found
    if (highValueCount > 0) {
      await this.sendHomeostasisSignal({
        signal_type: 'resurrection_opportunity',
        severity: resurrectCount > 5 ? 'critical' : 'warning',
        message: `High-value capabilities detected for resurrection: ${highValueCount} candidates`,
        metrics: {
          resurrect_recommended: resurrectCount,
          high_value_count: highValueCount,
        },
        recommended_action: this.config.enable_auto_resurrection
          ? 'Auto-resurrection enabled, will proceed'
          : 'Run reconstruction to generate resurrection patches',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`  ✅ Deletion detection event recorded`);
  }

  /**
   * Record reconstruction event
   */
  async recordReconstruction(
    bundles: ReconstructionBundle[],
    success: boolean
  ): Promise<void> {
    console.log(
      `Evolution Integration: Recording ${bundles.length} reconstruction bundles...`
    );

    const validCount = bundles.filter((b) => b.validation.syntax_valid).length;

    const event: EvolutionEvent = {
      id: this.generateEventId(),
      type: success ? 'RECONSTRUCTION_SUCCESS' : 'RECONSTRUCTION_FAILED',
      timestamp: new Date().toISOString(),
      source: 'archaeology_engine',
      payload: {
        total_bundles: bundles.length,
        valid_bundles: validCount,
        invalid_bundles: bundles.length - validCount,
        by_strategy: this.countByStrategy(bundles),
        avg_confidence: this.calculateAvgConfidence(bundles),
        total_files_restored: bundles.reduce((sum, b) => sum + b.target_paths.length, 0),
      },
      metadata: {
        repo_path: this.config.repo_path,
      },
    };

    await this.appendEvent(event);

    // If reconstruction was successful, emit health signal
    if (success && validCount > 0) {
      await this.sendHomeostasisSignal({
        signal_type: 'capability_health',
        severity: 'info',
        message: `Successfully reconstructed ${validCount} capabilities`,
        metrics: {
          reconstructed_count: validCount,
          confidence_avg: this.calculateAvgConfidence(bundles),
        },
        recommended_action: 'Apply patches to resurrect capabilities',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`  ✅ Reconstruction event recorded`);
  }

  /**
   * Record capability resurrection (after patch application)
   */
  async recordResurrection(
    bundle: ReconstructionBundle,
    applied: boolean
  ): Promise<void> {
    console.log(
      `Evolution Integration: Recording resurrection of ${bundle.capability_name}...`
    );

    const event: EvolutionEvent = {
      id: this.generateEventId(),
      type: 'CAPABILITY_RESURRECTED',
      timestamp: new Date().toISOString(),
      source: 'archaeology_engine',
      payload: {
        capability_name: bundle.capability_name,
        bundle_id: bundle.bundle_id,
        patch_applied: applied,
        synthesis_strategy: bundle.synthesis_strategy,
        confidence: bundle.confidence,
        target_paths: bundle.target_paths,
        original_author: bundle.provenance.original_author,
        original_commit: bundle.provenance.original_commit,
      },
      metadata: {
        repo_path: this.config.repo_path,
        commit_sha: bundle.provenance.original_commit,
        correlation_id: bundle.candidate_id,
      },
    };

    await this.appendEvent(event);

    console.log(`  ✅ Resurrection event recorded`);
  }

  /**
   * Record capability graph update
   */
  async recordGraphUpdate(graph: CapabilityGraph): Promise<void> {
    console.log(`Evolution Integration: Recording graph update...`);

    const event: EvolutionEvent = {
      id: this.generateEventId(),
      type: 'GRAPH_UPDATED',
      timestamp: new Date().toISOString(),
      source: 'archaeology_engine',
      payload: {
        total_nodes: graph.nodes.length,
        total_edges: graph.edges.length,
        fragments: graph.metadata.total_fragments,
        subsystems: graph.metadata.total_subsystems,
        deletions: graph.metadata.total_deletions,
        reconstructions: graph.metadata.total_reconstructions,
      },
      metadata: {
        repo_path: this.config.repo_path,
      },
    };

    await this.appendEvent(event);

    // Send capability health signal
    await this.sendHomeostasisSignal({
      signal_type: 'capability_health',
      severity: 'info',
      message: `Capability graph updated with ${graph.nodes.length} nodes`,
      metrics: {
        graph_nodes: graph.nodes.length,
        graph_edges: graph.edges.length,
        subsystems_tracked: graph.metadata.total_subsystems,
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`  ✅ Graph update event recorded`);
  }

  /**
   * Append event to evolution ledger
   */
  private async appendEvent(event: EvolutionEvent): Promise<void> {
    this.events.push(event);

    // Ensure ledger directory exists
    const ledgerDir = path.dirname(this.config.evolution_ledger_path);
    await fs.mkdir(ledgerDir, { recursive: true });

    // Append to ledger (JSONL format)
    const eventLine = JSON.stringify(event) + '\n';
    await fs.appendFile(this.config.evolution_ledger_path, eventLine);
  }

  /**
   * Send homeostasis signal
   */
  private async sendHomeostasisSignal(signal: HomeostasisSignal): Promise<void> {
    // Ensure signals directory exists
    const signalsDir = path.dirname(this.config.homeostasis_signals_path);
    await fs.mkdir(signalsDir, { recursive: true });

    // Append signal (JSONL format)
    const signalLine = JSON.stringify(signal) + '\n';
    await fs.appendFile(this.config.homeostasis_signals_path, signalLine);

    console.log(`  📡 Homeostasis signal sent: ${signal.signal_type} (${signal.severity})`);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Helper: Count fragment categories
   */
  private countFragmentCategories(fragments: CodeFragment[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const frag of fragments) {
      counts[frag.category] = (counts[frag.category] || 0) + 1;
    }
    return counts;
  }

  /**
   * Helper: Calculate average complexity
   */
  private calculateAvgComplexity(fragments: CodeFragment[]): number {
    if (fragments.length === 0) return 0;
    const sum = fragments.reduce((s, f) => s + f.complexity_score, 0);
    return Math.round((sum / fragments.length) * 10) / 10;
  }

  /**
   * Helper: Count by recommendation
   */
  private countByRecommendation(candidates: DeletionCandidate[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const c of candidates) {
      counts[c.recommendation] = (counts[c.recommendation] || 0) + 1;
    }
    return counts;
  }

  /**
   * Helper: Calculate average value score
   */
  private calculateAvgValueScore(candidates: DeletionCandidate[]): number {
    if (candidates.length === 0) return 0;
    const sum = candidates.reduce((s, c) => s + c.business_value.value_score, 0);
    return Math.round((sum / candidates.length) * 100) / 100;
  }

  /**
   * Helper: Count by strategy
   */
  private countByStrategy(bundles: ReconstructionBundle[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const b of bundles) {
      counts[b.synthesis_strategy] = (counts[b.synthesis_strategy] || 0) + 1;
    }
    return counts;
  }

  /**
   * Helper: Calculate average confidence
   */
  private calculateAvgConfidence(bundles: ReconstructionBundle[]): number {
    if (bundles.length === 0) return 0;
    const sum = bundles.reduce((s, b) => s + b.confidence, 0);
    return Math.round((sum / bundles.length) * 100) / 100;
  }

  /**
   * Get all recorded events
   */
  getEvents(): EvolutionEvent[] {
    return this.events;
  }

  /**
   * Get integration summary
   */
  getSummary(): IntegrationSummary {
    return {
      total_events: this.events.length,
      by_type: this.countEventsByType(),
      latest_event: this.events.length > 0 ? this.events[this.events.length - 1] : undefined,
    };
  }

  private countEventsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of this.events) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
    return counts;
  }
}

interface IntegrationSummary {
  total_events: number;
  by_type: Record<string, number>;
  latest_event?: EvolutionEvent;
}

/**
 * Create Evolution Integration instance
 */
export function createEvolutionIntegration(
  config: EvolutionIntegrationConfig
): EvolutionIntegration {
  return new EvolutionIntegration(config);
}
