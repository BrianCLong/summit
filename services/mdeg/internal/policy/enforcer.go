package policy

import (
	"fmt"
	"sync"

	"github.com/summit/mdeg/internal/config"
	"github.com/summit/mdeg/internal/provider"
)

// Engine manages loaded policies and enforces them for transfer requests.
type Engine struct {
	policies map[string]*Policy
	mu       sync.RWMutex
}

// NewEngine constructs an Engine from the provided configuration.
func NewEngine(cfg *config.Config, calc provider.CostCalculator) (*Engine, error) {
	policies := make(map[string]*Policy)
	for _, policyCfg := range cfg.Policies {
		policy, err := NewPolicy(policyCfg, calc)
		if err != nil {
			return nil, err
		}
		policies[policyCfg.ID] = policy
	}
	return &Engine{policies: policies}, nil
}

// Evaluate applies the appropriate policy to the transfer request.
func (e *Engine) Evaluate(req TransferRequest) (EvaluationOutcome, error) {
	policy, err := e.findPolicy(req)
	if err != nil {
		return EvaluationOutcome{Allowed: false}, err
	}
	outcome, evalErr := policy.Evaluate(req)
	return outcome, evalErr
}

func (e *Engine) findPolicy(req TransferRequest) (*Policy, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	if req.PolicyID != "" {
		if policy, ok := e.policies[req.PolicyID]; ok {
			if policy.Matches(req) {
				return policy, nil
			}
			return nil, fmt.Errorf("policy %s does not permit this transfer", req.PolicyID)
		}
		return nil, fmt.Errorf("unknown policy %s", req.PolicyID)
	}

	for _, policy := range e.policies {
		if policy.Matches(req) {
			return policy, nil
		}
	}

	return nil, fmt.Errorf("no policy matched the transfer request")
}

// Snapshot exposes a copy of the loaded policies for diagnostics.
func (e *Engine) Snapshot() map[string]map[string]any {
	e.mu.RLock()
	defer e.mu.RUnlock()
	snapshot := make(map[string]map[string]any)
	for id, policy := range e.policies {
		bytesUsed, costUsed, windowStart := policy.Snapshot()
		snapshot[id] = map[string]any{
			"bytesUsed":   bytesUsed,
			"costUsed":    costUsed,
			"windowStart": windowStart,
		}
	}
	return snapshot
}
