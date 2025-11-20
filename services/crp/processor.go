package crp

import (
	"context"
	"fmt"
	"sync"
)

// Processor coordinates deterministic propagation across all downstream systems.
type Processor struct {
	repo    Repository
	systems []System
	mu      sync.Mutex
}

// NewProcessor wires the provided repository and systems together.
func NewProcessor(repo Repository, systems ...System) *Processor {
	ordered := make([]System, len(systems))
	copy(ordered, systems)
	return &Processor{repo: repo, systems: ordered}
}

// ProcessEvent executes the unwind workflow for a single revocation event.
func (p *Processor) ProcessEvent(ctx context.Context, event Event) (PropagationResult, error) {
	if err := event.Validate(); err != nil {
		return PropagationResult{}, err
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	if result, ok := p.repo.Get(event.ID); ok {
		return result, nil
	}

	actions := make([]ActionResult, 0, len(p.systems))
	for _, system := range p.systems {
		select {
		case <-ctx.Done():
			return PropagationResult{}, fmt.Errorf("processing cancelled: %w", ctx.Err())
		default:
		}

		action, err := system.Apply(event)
		if err != nil {
			action.Status = "failed"
			action.Details = err.Error()
		}
		actions = append(actions, action)
	}

	result := PropagationResult{Event: event, Actions: actions}
	p.repo.Save(event.ID, result)
	return result, nil
}

// Replay runs the full event list, guaranteeing idempotent outcomes.
func (p *Processor) Replay(ctx context.Context, events []Event) ([]PropagationResult, error) {
	results := make([]PropagationResult, 0, len(events))
	for _, event := range events {
		result, err := p.ProcessEvent(ctx, event)
		if err != nil {
			return nil, err
		}
		results = append(results, result)
	}
	return results, nil
}

// Reconcile produces a consolidated report across all downstream systems for the
// provided subject.
func (p *Processor) Reconcile(ctx context.Context, subjectID string) (ReconciliationReport, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	systems := make([]SystemState, 0, len(p.systems))
	drift := false
	for _, system := range p.systems {
		select {
		case <-ctx.Done():
			return ReconciliationReport{}, fmt.Errorf("reconciliation cancelled: %w", ctx.Err())
		default:
		}
		state, err := system.Snapshot(subjectID)
		if err != nil {
			return ReconciliationReport{}, err
		}
		if state.SubjectPresent {
			drift = true
		}
		systems = append(systems, state)
	}

	return ReconciliationReport{
		SubjectID:     subjectID,
		DriftDetected: drift,
		Systems:       systems,
	}, nil
}
