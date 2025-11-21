# AI-Human Collaboration Service

> "Serve as an AI teammate—not a replacement—offering instant recommendations, highlighting probable outcomes, and enabling human-in-the-loop overrides with a single action. Train and retrain from operator feedback, maintaining full mission traceability for all automated actions."

## Overview

This service implements a comprehensive AI-Human collaboration framework with Commander's Control, designed for the intelligence analysis domain. It provides:

- **AI as Teammate**: Instant recommendations with confidence scoring
- **Probable Outcomes**: Risk assessment and outcome highlighting
- **Human-in-the-Loop**: Single-action overrides (accept/reject/modify/defer)
- **Continuous Learning**: Feedback collection and model retraining
- **Full Traceability**: Tamper-evident audit trail with hash-chain integrity

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 AIHumanCollaborationService                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ RecommendationEngine│  │  CommanderControl │                    │
│  │                  │  │                  │                    │
│  │ • Confidence     │  │ • Accept/Reject  │                    │
│  │ • Risk Assessment│──│ • Modify/Defer   │                    │
│  │ • Outcomes       │  │ • Authority      │                    │
│  └──────────────────┘  └──────────────────┘                    │
│           │                     │                              │
│           ▼                     ▼                              │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ FeedbackCollector │  │MissionTraceability│                    │
│  │                  │  │                  │                    │
│  │ • Ratings        │  │ • Hash Chain     │                    │
│  │ • Corrections    │  │ • Audit Search   │                    │
│  │ • Retraining     │  │ • Integrity      │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
pnpm add @intelgraph/ai-human-collaboration
```

## Quick Start

```typescript
import { AIHumanCollaborationService } from '@intelgraph/ai-human-collaboration';

// Initialize service
const service = new AIHumanCollaborationService({
  autoApprovalThreshold: 0.85,
  defaultAutonomyLevel: 'supervised',
});

// Start collaboration session
const session = service.startSession('mission-123', 'commander-id');

// AI generates recommendation
const recommendation = await service.recommend(
  'mission-123',
  'analyze_entity',
  'read',
  { entityId: 'entity-456' },
  { urgency: 'high', context: 'investigation' }
);

// Review probable outcomes
const outcomes = service.getOutcomeHighlights(recommendation.id);
console.log('Positive:', outcomes.positiveOutcomes);
console.log('Risks:', outcomes.negativeOutcomes);

// Commander decides
const commander = {
  id: 'cmd-1',
  name: 'Mission Commander',
  role: 'mission_commander',
  authority: 'full',
  permissions: ['*'],
};

const decision = await service.decide(
  recommendation.id,
  'accepted',
  commander,
  'Approved for execution'
);

// Operator provides feedback
const operator = { id: 'op-1', name: 'Analyst', role: 'analyst' };
await service.submitFeedback(
  recommendation.id,
  operator,
  5,          // rating
  true,       // wasCorrect
  'positive', // sentiment
  'Excellent recommendation'
);

// Verify audit integrity
const integrity = service.verifyMissionIntegrity('mission-123');
console.log('Audit valid:', integrity.valid);

// End session
service.endSession(session.id);
```

## Autonomy Levels

| Level | Description | Approval Required |
|-------|-------------|-------------------|
| `full_auto` | AI executes without human intervention | Never |
| `supervised` | AI executes low-risk; humans approve high-risk | Risk-based |
| `advisory` | AI recommends; humans always approve | Always |
| `manual_only` | AI provides info; humans decide everything | Always |

## Confidence Bands

| Band | Threshold | Auto-Approval Eligible |
|------|-----------|------------------------|
| `high` | ≥ 0.8 | Yes (if low risk) |
| `medium` | 0.5 - 0.8 | No |
| `low` | 0.3 - 0.5 | No |
| `uncertain` | < 0.3 | No |

## Risk Levels

| Level | Requires Approval | Examples |
|-------|-------------------|----------|
| `low` | Configurable | Read operations |
| `medium` | Configurable | Update operations |
| `high` | Yes (default) | Delete operations |
| `critical` | Always | Impersonation, global changes |

## API Reference

### AIHumanCollaborationService

Main orchestration service.

```typescript
class AIHumanCollaborationService {
  constructor(config?: Partial<CollaborationConfig>);

  // Session management
  startSession(missionId: string, commanderId: string, autonomyLevel?: AutonomyLevel): CollaborationSession;
  endSession(sessionId: string): CollaborationSession;
  getActiveSession(missionId: string): CollaborationSession | undefined;

  // Recommendations
  recommend(missionId: string, action: string, actionType: string, parameters: Record<string, unknown>, context?: Record<string, unknown>): Promise<Recommendation>;
  getOutcomeHighlights(recommendationId: string): { positiveOutcomes, negativeOutcomes, uncertainOutcomes } | null;

  // Decisions
  decide(recommendationId: string, outcome: DecisionOutcome, commander: Commander, reason: string, modifiedAction?: string, modifiedParameters?: Record<string, unknown>): Promise<CommanderDecision>;

  // Feedback
  submitFeedback(recommendationId: string, operator: Operator, rating: number, wasCorrect: boolean, sentiment?: FeedbackSentiment, comments?: string, correctAction?: string, correctParameters?: Record<string, unknown>): Promise<OperatorFeedback>;

  // Traceability
  getMissionAuditTrail(missionId: string): MissionAuditEntry[];
  verifyMissionIntegrity(missionId: string): { valid: boolean, brokenAt?: string, details: string };

  // Statistics
  getStatistics(missionId: string): { session, feedback, traceability, decisions };
}
```

### RecommendationEngine

Generates AI recommendations with confidence scoring.

```typescript
class RecommendationEngine {
  generateRecommendation(input: RecommendationInput, autonomyLevel?: AutonomyLevel): Promise<Recommendation>;
  canAutoApprove(recommendation: Recommendation): boolean;
  highlightOutcomes(recommendation: Recommendation): { positiveOutcomes, negativeOutcomes, uncertainOutcomes };
}
```

### CommanderControl

Handles human-in-the-loop decisions.

```typescript
class CommanderControl {
  accept(recommendationId: string, commander: Commander, reason: string): Promise<CommanderDecision>;
  reject(recommendationId: string, commander: Commander, reason: string): Promise<CommanderDecision>;
  modify(recommendationId: string, commander: Commander, reason: string, modifiedAction: string, modifiedParameters: Record<string, unknown>): Promise<CommanderDecision>;
  defer(recommendationId: string, commander: Commander, reason: string): Promise<CommanderDecision>;
}
```

### FeedbackCollector

Collects operator feedback for model retraining.

```typescript
class FeedbackCollector {
  submitFeedback(input: FeedbackInput, operator: Operator): Promise<OperatorFeedback>;
  getCorrectiveFeedback(): OperatorFeedback[];
  createTrainingBatch(targetModelVersion: string): Promise<TrainingBatch | null>;
  getStatistics(): FeedbackStatistics;
}
```

### MissionTraceability

Maintains tamper-evident audit trail.

```typescript
class MissionTraceability {
  record(input: AuditInput): MissionAuditEntry;
  getMissionTrail(missionId: string): MissionAuditEntry[];
  verifyIntegrity(missionId: string): IntegrityResult;
  search(criteria: SearchCriteria): MissionAuditEntry[];
  exportTrail(missionId: string, format: 'json' | 'csv'): string;
}
```

## Performance Utilities

The service includes performance utilities for high-throughput operations:

```typescript
import { LRUCache, SecondaryIndex, RateLimiter, MetricsCollector } from '@intelgraph/ai-human-collaboration';

// LRU Cache for frequently accessed items
const cache = new LRUCache<string, Recommendation>(1000);

// Secondary index for efficient lookups
const missionIndex = new SecondaryIndex<string, string>();

// Rate limiting for API protection
const limiter = new RateLimiter(100, 10); // 100 tokens, refill 10/sec

// Metrics collection
const metrics = new MetricsCollector();
metrics.timerAsync('recommendation_latency', async () => {
  return service.recommend(...);
});
```

## Configuration

```typescript
interface CollaborationConfig {
  // Autonomy settings
  defaultAutonomyLevel: AutonomyLevel;     // 'supervised'
  autoApprovalEnabled: boolean;             // true
  autoApprovalThreshold: number;            // 0.85

  // Confidence thresholds
  highConfidenceThreshold: number;          // 0.8
  lowConfidenceThreshold: number;           // 0.5

  // Timeout settings
  recommendationTtlMs: number;              // 300000 (5 min)
  decisionTimeoutMs: number;                // 1800000 (30 min)

  // Feedback settings
  feedbackRequired: boolean;                // false
  minFeedbackForRetraining: number;         // 100

  // Risk settings
  criticalRiskRequiresApproval: boolean;    // true
  highRiskRequiresApproval: boolean;        // true
}
```

## Integration with Agent Gateway

```typescript
import { AIHumanCollaborationService } from '@intelgraph/ai-human-collaboration';
import { AgentGateway } from '@intelgraph/agent-gateway';

// Connect collaboration service to agent gateway
const collaboration = new AIHumanCollaborationService();
const gateway = new AgentGateway();

// Use collaboration for approval workflows
gateway.setApprovalHandler(async (action) => {
  const rec = await collaboration.recommend(
    action.runId,
    action.type,
    action.category,
    action.parameters
  );

  if (collaboration.engine.canAutoApprove(rec)) {
    return { approved: true, reason: 'Auto-approved' };
  }

  // Wait for human decision
  return collaboration.waitForDecision(rec.id);
});
```

## Testing

```bash
pnpm test
```

## License

UNLICENSED - Proprietary
