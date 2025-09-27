package engine

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	// ErrTraceNotFound is returned when a trace cannot be located.
	ErrTraceNotFound = errors.New("trace not found")
)

// Engine evaluates events and tracks drift findings.
type Engine struct {
	cfg         Config
	mu          sync.RWMutex
	contracts   map[string]ConsentContract
	alerts      []Alert
	traces      map[string]Trace
	suppression map[string]time.Time

	controlEvaluations int
	controlAlerts      int
}

// New creates a configured engine.
func New(cfg Config) *Engine {
	if cfg.DefaultSuppression <= 0 {
		cfg.DefaultSuppression = 5 * time.Minute
	}
	if cfg.MaxTraces <= 0 {
		cfg.MaxTraces = 512
	}
	return &Engine{
		cfg:         cfg,
		contracts:   make(map[string]ConsentContract),
		traces:      make(map[string]Trace),
		suppression: make(map[string]time.Time),
	}
}

// LoadContracts replaces the consent registry.
func (e *Engine) LoadContracts(contracts []ConsentContract) {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.contracts = make(map[string]ConsentContract, len(contracts))
	for _, c := range contracts {
		copied := c
		if copied.EndpointPolicies == nil {
			copied.EndpointPolicies = map[string]EndpointPolicy{}
		}
		e.contracts[c.ID] = copied
	}
}

// ReplayFromReader replays newline-delimited events from the reader and returns the resulting alerts.
func (e *Engine) ReplayFromReader(ctx context.Context, r io.Reader) ([]Alert, error) {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 1024), 1024*1024)
	var alerts []Alert
	for scanner.Scan() {
		if err := ctx.Err(); err != nil {
			return alerts, err
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var evt Event
		if err := json.Unmarshal([]byte(line), &evt); err != nil {
			return alerts, fmt.Errorf("decode event: %w", err)
		}
		verdict := e.Evaluate(evt)
		if verdict.Drift && !verdict.Suppressed {
			alerts = append(alerts, Alert{Event: evt, Verdict: verdict, RaisedAt: evt.ObservedAt})
		}
	}
	if err := scanner.Err(); err != nil {
		return alerts, err
	}
	return alerts, nil
}

// Evaluate runs an event through the engine, producing a verdict.
func (e *Engine) Evaluate(evt Event) Verdict {
	e.mu.Lock()
	defer e.mu.Unlock()

	trace := Trace{
		EventID:    evt.ID,
		ContractID: evt.ConsentID,
		Event:      evt,
		Steps:      []TraceStep{},
	}

	if evt.StreamKind == "control" {
		e.controlEvaluations++
	}

	contract, ok := e.contracts[evt.ConsentID]
	if !ok {
		reason := "consent contract not found"
		trace.PolicyID = evt.EndpointPurpose
		trace.Steps = append(trace.Steps, TraceStep{Description: "lookup contract", Evidence: reason})
		verdict := e.finishVerdict(trace, evt, true, reason, "unowned")
		if verdict.Drift && evt.StreamKind == "control" {
			verdict.FalsePositive = true
			e.controlAlerts++
		}
		return verdict
	}

	policy, ok := contract.EndpointPolicies[evt.EndpointPurpose]
	if !ok {
		reason := fmt.Sprintf("no endpoint policy registered for %s", evt.EndpointPurpose)
		trace.PolicyID = evt.EndpointPurpose
		trace.Steps = append(trace.Steps, TraceStep{Description: "fetch policy", Evidence: reason})
		verdict := e.finishVerdict(trace, evt, true, reason, e.resolveOwner(evt, policy))
		if verdict.Drift && evt.StreamKind == "control" {
			verdict.FalsePositive = true
			e.controlAlerts++
		}
		return verdict
	}

	trace.Policy = policy
	trace.PolicyID = policy.EndpointPurpose
	allowed := make([]string, len(policy.AllowedPurposes))
	copy(allowed, policy.AllowedPurposes)
	sort.Strings(allowed)
	trace.Steps = append(trace.Steps, TraceStep{
		Description: "allowed purposes",
		Evidence:    strings.Join(allowed, ","),
	})

	drift := true
	for _, p := range policy.AllowedPurposes {
		if p == evt.DeclaredPurpose {
			drift = false
			break
		}
	}

	var reason string
	if drift {
		reason = fmt.Sprintf("purpose %s not allowed on %s", evt.DeclaredPurpose, policy.EndpointPurpose)
		trace.Steps = append(trace.Steps, TraceStep{Description: "compare", Evidence: reason})
	} else {
		reason = "purpose aligned"
		trace.Steps = append(trace.Steps, TraceStep{Description: "compare", Evidence: reason})
	}

	verdict := e.finishVerdict(trace, evt, drift, reason, e.resolveOwner(evt, policy))
	if verdict.Drift && evt.StreamKind == "control" {
		verdict.FalsePositive = true
		e.controlAlerts++
	}
	return verdict
}

func (e *Engine) resolveOwner(evt Event, policy EndpointPolicy) string {
	if evt.OwnerHint != "" {
		return evt.OwnerHint
	}
	if len(policy.Owners) > 0 {
		return strings.Join(policy.Owners, ",")
	}
	return "unassigned"
}

func (e *Engine) finishVerdict(trace Trace, evt Event, drift bool, reason, owner string) Verdict {
	if !drift {
		trace.Verdict = "aligned"
		e.recordTrace(trace)
		return Verdict{Drift: false, Suppressed: false, Owner: owner, Reason: reason, Trace: trace}
	}

	window := e.cfg.DefaultSuppression
	if trace.Policy.SuppressionWindow > 0 {
		window = trace.Policy.SuppressionWindow
	}
	key := fmt.Sprintf("%s|%s|%s", evt.ConsentID, trace.PolicyID, evt.DeclaredPurpose)
	last := e.suppression[key]
	suppressed := !last.IsZero() && evt.ObservedAt.Sub(last) < window
	trace.Suppressed = suppressed
	trace.Verdict = "drift"

	if !suppressed {
		e.suppression[key] = evt.ObservedAt
		alert := Alert{Event: evt, Verdict: Verdict{Drift: true, Suppressed: false, Owner: owner, Reason: reason, Trace: trace}, RaisedAt: evt.ObservedAt}
		e.alerts = append(e.alerts, alert)
		if len(e.alerts) > 1024 {
			e.alerts = e.alerts[len(e.alerts)-1024:]
		}
	}

	verdict := Verdict{Drift: true, Suppressed: suppressed, Owner: owner, Reason: reason, Trace: trace}
	e.recordTrace(trace)
	return verdict
}

func (e *Engine) recordTrace(trace Trace) {
	if e.traces == nil {
		e.traces = make(map[string]Trace)
	}
	e.traces[trace.EventID] = trace
	if len(e.traces) > e.cfg.MaxTraces {
		// Remove an arbitrary entry to stay bounded.
		for k := range e.traces {
			delete(e.traces, k)
			if len(e.traces) <= e.cfg.MaxTraces {
				break
			}
		}
	}
}

// StartRuleStream consumes streaming rule updates until the context ends.
func (e *Engine) StartRuleStream(ctx context.Context, updates <-chan RuleUpdate) {
	for {
		select {
		case <-ctx.Done():
			return
		case upd := <-updates:
			e.applyRuleUpdate(upd)
		}
	}
}

func (e *Engine) applyRuleUpdate(upd RuleUpdate) {
	e.mu.Lock()
	defer e.mu.Unlock()

	contract, ok := e.contracts[upd.ContractID]
	if !ok {
		contract = ConsentContract{ID: upd.ContractID, EndpointPolicies: map[string]EndpointPolicy{}}
	} else if contract.EndpointPolicies == nil {
		contract.EndpointPolicies = map[string]EndpointPolicy{}
	}

	if upd.Delete {
		delete(contract.EndpointPolicies, upd.Policy.EndpointPurpose)
	} else {
		contract.EndpointPolicies[upd.Policy.EndpointPurpose] = upd.Policy
	}
	e.contracts[contract.ID] = contract
}

// Alerts returns the current drift findings.
func (e *Engine) Alerts() []Alert {
	e.mu.RLock()
	defer e.mu.RUnlock()
	out := make([]Alert, len(e.alerts))
	copy(out, e.alerts)
	return out
}

// Explain fetches the recorded trace for an event.
func (e *Engine) Explain(eventID string) (Trace, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	trace, ok := e.traces[eventID]
	if !ok {
		return Trace{}, ErrTraceNotFound
	}
	return trace, nil
}

// FalsePositiveRate returns the measured false positive rate across control streams.
func (e *Engine) FalsePositiveRate() float64 {
	e.mu.RLock()
	defer e.mu.RUnlock()
	if e.controlEvaluations == 0 {
		return 0
	}
	return float64(e.controlAlerts) / float64(e.controlEvaluations)
}

// SnapshotContracts exposes the in-memory consent registry.
func (e *Engine) SnapshotContracts() []ConsentContract {
	e.mu.RLock()
	defer e.mu.RUnlock()

	out := make([]ConsentContract, 0, len(e.contracts))
	for _, c := range e.contracts {
		out = append(out, c)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

// StreamRuleUpdates reads NDJSON updates from a reader and forwards them to the channel.
func StreamRuleUpdates(ctx context.Context, r io.Reader, out chan<- RuleUpdate) error {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 1024), 1024*1024)
	for scanner.Scan() {
		if err := ctx.Err(); err != nil {
			return err
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var upd RuleUpdate
		if err := json.Unmarshal([]byte(line), &upd); err != nil {
			return fmt.Errorf("decode rule update: %w", err)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case out <- upd:
		}
	}
	return scanner.Err()
}
