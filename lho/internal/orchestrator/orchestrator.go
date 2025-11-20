package orchestrator

import (
	"context"
	"fmt"
	"time"

	"github.com/summit/lho/internal/custody"
	"github.com/summit/lho/internal/model"
	"github.com/summit/lho/internal/systems"
)

// HoldRequest describes a hold invocation across systems.
type HoldRequest struct {
	ID         string
	Scope      model.Scope
	Freeze     bool
	Snapshot   bool
	Tags       map[string]string
	PreventTTL bool
	Window     custody.Window
}

// HoldResult aggregates per-system responses.
type HoldResult struct {
	Reports map[string]systems.Report
	Events  []custody.Event
}

// Orchestrator applies hold directives and tracks custody chain entries.
type Orchestrator struct {
	systems []systems.System
	ledger  *custody.Ledger
}

func New(systems []systems.System, ledger *custody.Ledger) *Orchestrator {
	return &Orchestrator{systems: systems, ledger: ledger}
}

// IssueHold applies the directive to each configured system and records
// custody events.
func (o *Orchestrator) IssueHold(ctx context.Context, req HoldRequest) (HoldResult, error) {
	if req.ID == "" {
		return HoldResult{}, fmt.Errorf("hold id required")
	}

	result := HoldResult{Reports: make(map[string]systems.Report)}

	for _, system := range o.systems {
		report, err := system.ApplyHold(ctx, req.Scope, req.Freeze, req.Snapshot, req.Tags, req.PreventTTL)
		if err != nil {
			return HoldResult{}, fmt.Errorf("apply hold on %s: %w", system.Name(), err)
		}
		if len(report.FingerprintValues) > 0 {
			fingerprint := append([]string(nil), report.FingerprintValues...)
			event := o.ledger.Record(req.ID, system.Name(), "apply", fingerprint, time.Now())
			result.Events = append(result.Events, event)
		}
		result.Reports[system.Name()] = report
	}

	return result, nil
}

// VerifyHold checks each system and records verification events when the hold
// remains intact throughout the window.
func (o *Orchestrator) VerifyHold(ctx context.Context, req HoldRequest) ([]custody.Event, error) {
	var events []custody.Event

	for _, system := range o.systems {
		ids := req.Scope.Systems[system.Name()]
		if len(ids) == 0 {
			continue
		}

		if err := system.Verify(ctx, req.Scope); err != nil {
			return nil, fmt.Errorf("verify hold on %s: %w", system.Name(), err)
		}

		tempScope := model.Scope{Systems: map[string][]string{system.Name(): append([]string(nil), ids...)}}
		summary, err := system.ApplyHold(context.Background(), tempScope, false, false, nil, false)
		if err != nil {
			return nil, fmt.Errorf("snapshot fingerprint for %s: %w", system.Name(), err)
		}

		if len(summary.FingerprintValues) > 0 {
			event := o.ledger.Record(req.ID, system.Name(), "verify", append([]string(nil), summary.FingerprintValues...), time.Now())
			events = append(events, event)
		}
	}

	return events, nil
}

// Ledger returns the custody ledger.
func (o *Orchestrator) Ledger() *custody.Ledger {
	return o.ledger
}
