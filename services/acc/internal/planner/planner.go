package planner

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/summit/acc/internal/config"
	"github.com/summit/acc/internal/health"
	"github.com/summit/acc/internal/session"
	"github.com/summit/acc/internal/telemetry"
)

type Request struct {
	ID           string `json:"id"`
	TenantID     string `json:"tenantId"`
	Operation    string `json:"operation"`
	Session      string `json:"session"`
	DataClass    string `json:"dataClass"`
	Purpose      string `json:"purpose"`
	Jurisdiction string `json:"jurisdiction"`
}

type ExplainStep struct {
	Stage   string                 `json:"stage"`
	Message string                 `json:"message"`
	Meta    map[string]interface{} `json:"meta,omitempty"`
}

type ReplicaTarget struct {
	Name         string `json:"name"`
	Region       string `json:"region"`
	Role         string `json:"role"`
	LatencyMs    int    `json:"latencyMs"`
	StalenessMs  int    `json:"stalenessMs"`
	IsQuorum     bool   `json:"isQuorum"`
	IsPrimary    bool   `json:"isPrimary"`
	SyncRequired bool   `json:"syncRequired"`
}

type RoutePlan struct {
	Quorum               []string        `json:"quorum"`
	Replicas             []ReplicaTarget `json:"replicas"`
	EstimatedLatencyMs   int             `json:"estimatedLatencyMs"`
	ConsistencyScore     float64         `json:"consistencyScore"`
	BoundedStalenessSla  int             `json:"boundedStalenessSla"`
	FallbackToStrongMode bool            `json:"fallbackToStrongMode,omitempty"`
}

type PlanResult struct {
	Mode    config.Mode   `json:"mode"`
	SLA     int           `json:"stalenessSlaMs"`
	Route   RoutePlan     `json:"route"`
	Explain []ExplainStep `json:"explain"`
}

type ReplicaMetrics struct {
	LatencyMs   int
	StalenessMs int
}

type Planner struct {
	policies []config.PolicyRule
	replicas []config.Replica

	metrics         map[string]ReplicaMetrics
	store           *session.Store
	gateKeeper      *health.GateKeeper
	conflictTracker *telemetry.InMemoryConflictTracker

	now func() time.Time
}

func New(cfg *config.Config) *Planner {
	metrics := make(map[string]ReplicaMetrics, len(cfg.Replicas))
	for _, r := range cfg.Replicas {
		metrics[r.Name] = ReplicaMetrics{LatencyMs: r.DefaultLatencyMs}
	}
	return &Planner{
		policies:        cfg.Policies,
		replicas:        cfg.Replicas,
		metrics:         metrics,
		store:           session.NewStore(),
		gateKeeper:      health.NewGateKeeper(health.DefaultGateConfig()),
		conflictTracker: telemetry.NewInMemoryConflictTracker(),
		now:             time.Now,
	}
}

func (p *Planner) SetGateKeeper(gk *health.GateKeeper) {
	p.gateKeeper = gk
}

func (p *Planner) SetConflictTracker(ct *telemetry.InMemoryConflictTracker) {
	p.conflictTracker = ct
}

func (p *Planner) SetNow(now func() time.Time) {
	p.now = now
}

func (p *Planner) UpdateReplica(name string, metrics ReplicaMetrics) error {
	if _, ok := p.metrics[name]; !ok {
		return fmt.Errorf("replica %s not found", name)
	}
	p.metrics[name] = metrics
	return nil
}

func (p *Planner) Plan(ctx context.Context, req Request) (PlanResult, error) {
	if req.Operation != "read" && req.Operation != "write" {
		return PlanResult{}, fmt.Errorf("unsupported operation %q", req.Operation)
	}
	steps := []ExplainStep{}

	rule, err := p.matchRule(req)
	if err != nil {
		return PlanResult{}, err
	}
	steps = append(steps, ExplainStep{
		Stage:   "policy-match",
		Message: "matched policy rule",
		Meta: map[string]interface{}{
			"mode":         rule.Mode,
			"dataClass":    rule.DataClass,
			"purpose":      rule.Purpose,
			"jurisdiction": rule.Jurisdiction,
		},
	})

	var plan PlanResult
	plan.Mode = rule.Mode
	plan.SLA = int(rule.StalenessSLA.Milliseconds())

	switch rule.Mode {
	case config.ModeStrong:
		// Check health gate for Write Quorum (Strong Mode)
		// If check fails, fallback to a safer mode or primary-only.
		// For now, we assume fallback to single-primary if quorum is unhealthy.
		allowed, reason := true, ""
		if p.gateKeeper != nil && req.TenantID != "" {
			allowed, reason = p.gateKeeper.Check(req.TenantID)
		}

		if !allowed {
			steps = append(steps, ExplainStep{
				Stage:   "health-gate",
				Message: "quorum health gate failed; falling back to primary",
				Meta: map[string]interface{}{
					"reason": reason,
				},
			})
			// Fallback logic: Use planStrong but modify to primary-only?
			// Or just pick the primary.
			// Currently planStrong builds a quorum.
			// Let's implement a simple planPrimary fallback.
			route, explain := p.planPrimary(rule)
			route.FallbackToStrongMode = false // It's actually falling back FROM strong
			plan.Route = route
			steps = append(steps, explain...)
		} else {
			route, explain := p.planStrong(rule)
			plan.Route = route
			steps = append(steps, explain...)
		}

		if req.Operation == "write" && req.Session != "" && len(plan.Route.Quorum) > 0 {
			p.store.RecordWrite(req.Session, plan.Route.Quorum[0])
		}
		// Record potential write for conflict tracking
		if req.Operation == "write" && req.TenantID != "" && p.conflictTracker != nil {
			p.conflictTracker.RecordWrite(req.TenantID)
		}
	case config.ModeBoundedStaleness:
		route, explain := p.planBounded(rule)
		plan.Route = route
		steps = append(steps, explain...)
		if req.Operation == "write" && req.Session != "" {
			p.store.RecordWrite(req.Session, route.Quorum[0])
		}
	case config.ModeReadMyWrites:
		route, explain := p.planReadMyWrites(rule, req)
		plan.Route = route
		steps = append(steps, explain...)
		if req.Operation == "write" && req.Session != "" {
			p.store.RecordWrite(req.Session, route.Quorum[0])
		}
	default:
		return PlanResult{}, fmt.Errorf("unsupported mode %q", rule.Mode)
	}

	plan.Explain = steps
	return plan, nil
}

func (p *Planner) matchRule(req Request) (config.PolicyRule, error) {
	for _, rule := range p.policies {
		if matchField(rule.DataClass, req.DataClass) &&
			matchField(rule.Purpose, req.Purpose) &&
			matchField(rule.Jurisdiction, req.Jurisdiction) {
			return rule, nil
		}
	}
	return config.PolicyRule{}, errors.New("no matching policy rule")
}

func matchField(ruleValue, requestValue string) bool {
	return ruleValue == "*" || ruleValue == "" || ruleValue == requestValue
}

func (p *Planner) planPrimary(rule config.PolicyRule) (RoutePlan, []ExplainStep) {
	steps := []ExplainStep{{
		Stage:   "mode",
		Message: "fallback to primary-only due to health gate",
	}}

	var primary config.Replica
	found := false
	for _, r := range p.replicas {
		if r.Role == "primary" {
			primary = r
			found = true
			break
		}
	}

	if !found {
		// If no primary found, fall back to first available (emergency)
		if len(p.replicas) > 0 {
			primary = p.replicas[0]
		}
	}

	metrics := p.metrics[primary.Name]
	target := ReplicaTarget{
		Name:         primary.Name,
		Region:       primary.Region,
		Role:         primary.Role,
		LatencyMs:    metrics.LatencyMs,
		StalenessMs:  metrics.StalenessMs,
		SyncRequired: primary.Synchronous,
		IsPrimary:    primary.Role == "primary",
		IsQuorum:     true, // Even single node is a "quorum" of 1
	}

	steps = append(steps, ExplainStep{
		Stage:   "route",
		Message: "selected primary",
		Meta: map[string]interface{}{
			"primary": primary.Name,
		},
	})

	return RoutePlan{
		Quorum:             []string{primary.Name},
		Replicas:           []ReplicaTarget{target},
		EstimatedLatencyMs: metrics.LatencyMs,
		ConsistencyScore:   1.0,
	}, steps
}

func (p *Planner) planStrong(rule config.PolicyRule) (RoutePlan, []ExplainStep) {
	steps := []ExplainStep{{
		Stage:   "mode",
		Message: "strong consistency requires quorum with synchronous replicas",
	}}

	sorted := append([]config.Replica(nil), p.replicas...)
	sort.SliceStable(sorted, func(i, j int) bool {
		left := p.metrics[sorted[i].Name]
		right := p.metrics[sorted[j].Name]
		return left.LatencyMs < right.LatencyMs
	})

	quorumSize := len(sorted)/2 + 1
	quorum := make([]string, 0, quorumSize)
	replicas := make([]ReplicaTarget, 0, len(sorted))

	for _, replica := range sorted {
		metrics := p.metrics[replica.Name]
		target := ReplicaTarget{
			Name:         replica.Name,
			Region:       replica.Region,
			Role:         replica.Role,
			LatencyMs:    metrics.LatencyMs,
			StalenessMs:  metrics.StalenessMs,
			SyncRequired: replica.Synchronous,
			IsPrimary:    replica.Role == "primary",
		}
		replicas = append(replicas, target)
	}

	// always include primary first when available
	for i := range replicas {
		if replicas[i].IsPrimary {
			replicas[i].IsQuorum = true
			quorum = append(quorum, replicas[i].Name)
			break
		}
	}

	// prefer synchronous replicas next
	for i := range replicas {
		if len(quorum) >= quorumSize {
			break
		}
		if replicas[i].IsPrimary || !replicas[i].SyncRequired {
			continue
		}
		replicas[i].IsQuorum = true
		quorum = append(quorum, replicas[i].Name)
	}

	// fill remainder with lowest latency replicas
	for i := range replicas {
		if len(quorum) >= quorumSize {
			break
		}
		if replicas[i].IsQuorum {
			continue
		}
		replicas[i].IsQuorum = true
		quorum = append(quorum, replicas[i].Name)
	}

	estimated := 0
	for _, q := range quorum {
		estimated += p.metrics[q].LatencyMs
	}

	steps = append(steps, ExplainStep{
		Stage:   "route",
		Message: "selected quorum",
		Meta: map[string]interface{}{
			"quorum": quorum,
		},
	})

	return RoutePlan{
		Quorum:             quorum,
		Replicas:           replicas,
		EstimatedLatencyMs: estimated,
		ConsistencyScore:   1.0,
	}, steps
}

func (p *Planner) planBounded(rule config.PolicyRule) (RoutePlan, []ExplainStep) {
	steps := []ExplainStep{{
		Stage:   "mode",
		Message: "bounded staleness uses freshest replica within SLA",
		Meta: map[string]interface{}{
			"slaMs": int(rule.StalenessSLA.Milliseconds()),
		},
	}}

	type candidate struct {
		replica config.Replica
		metrics ReplicaMetrics
	}

	var matches []candidate
	for _, replica := range p.replicas {
		metrics := p.metrics[replica.Name]
		if metrics.StalenessMs <= int(rule.StalenessSLA.Milliseconds()) {
			matches = append(matches, candidate{replica: replica, metrics: metrics})
		}
	}

	if len(matches) == 0 {
		steps = append(steps, ExplainStep{
			Stage:   "fallback",
			Message: "no replica satisfied SLA; escalating to strong",
		})
		route, strongSteps := p.planStrong(rule)
		route.FallbackToStrongMode = true
		steps = append(steps, strongSteps...)
		return route, steps
	}

	sort.Slice(matches, func(i, j int) bool {
		return matches[i].metrics.LatencyMs < matches[j].metrics.LatencyMs
	})

	selected := matches[0]
	plan := RoutePlan{
		Quorum: []string{selected.replica.Name},
		Replicas: []ReplicaTarget{{
			Name:        selected.replica.Name,
			Region:      selected.replica.Region,
			Role:        selected.replica.Role,
			LatencyMs:   selected.metrics.LatencyMs,
			StalenessMs: selected.metrics.StalenessMs,
			IsQuorum:    true,
			IsPrimary:   selected.replica.Role == "primary",
		}},
		EstimatedLatencyMs:  selected.metrics.LatencyMs,
		ConsistencyScore:    0.7,
		BoundedStalenessSla: int(rule.StalenessSLA.Milliseconds()),
	}

	steps = append(steps, ExplainStep{
		Stage:   "route",
		Message: "selected bounded stale replica",
		Meta: map[string]interface{}{
			"replica":     selected.replica.Name,
			"latencyMs":   selected.metrics.LatencyMs,
			"stalenessMs": selected.metrics.StalenessMs,
		},
	})

	return plan, steps
}

func (p *Planner) planReadMyWrites(rule config.PolicyRule, req Request) (RoutePlan, []ExplainStep) {
	steps := []ExplainStep{{
		Stage:   "mode",
		Message: "read-my-writes enforces session stickiness",
	}}

	if req.Operation == "write" || req.Session == "" {
		strong, strongSteps := p.planStrong(rule)
		steps = append(steps, strongSteps...)
		return strong, steps
	}

	state, ok := p.store.Last(req.Session)
	if !ok {
		steps = append(steps, ExplainStep{
			Stage:   "session",
			Message: "no prior writes for session; using strong",
		})
		strong, strongSteps := p.planStrong(rule)
		strong.FallbackToStrongMode = true
		steps = append(steps, strongSteps...)
		return strong, steps
	}

	metrics := p.metrics[state.Replica]
	if metrics.StalenessMs > int(rule.StalenessSLA.Milliseconds()) {
		steps = append(steps, ExplainStep{
			Stage:   "session",
			Message: "session replica stale; falling back to strong",
			Meta: map[string]interface{}{
				"replica":     state.Replica,
				"stalenessMs": metrics.StalenessMs,
			},
		})
		strong, strongSteps := p.planStrong(rule)
		strong.FallbackToStrongMode = true
		steps = append(steps, strongSteps...)
		return strong, steps
	}

	plan := RoutePlan{
		Quorum: []string{state.Replica},
		Replicas: []ReplicaTarget{{
			Name:        state.Replica,
			Region:      regionOf(p.replicas, state.Replica),
			Role:        roleOf(p.replicas, state.Replica),
			LatencyMs:   metrics.LatencyMs,
			StalenessMs: metrics.StalenessMs,
			IsQuorum:    true,
			IsPrimary:   roleOf(p.replicas, state.Replica) == "primary",
		}},
		EstimatedLatencyMs:  metrics.LatencyMs,
		ConsistencyScore:    0.9,
		BoundedStalenessSla: int(rule.StalenessSLA.Milliseconds()),
	}

	steps = append(steps, ExplainStep{
		Stage:   "session",
		Message: "session routed to last-write replica",
		Meta: map[string]interface{}{
			"replica":      state.Replica,
			"lastWriteSeq": state.LastWriteN,
		},
	})

	return plan, steps
}

func regionOf(replicas []config.Replica, name string) string {
	for _, replica := range replicas {
		if replica.Name == name {
			return replica.Region
		}
	}
	return ""
}

func roleOf(replicas []config.Replica, name string) string {
	for _, replica := range replicas {
		if replica.Name == name {
			return replica.Role
		}
	}
	return ""
}
