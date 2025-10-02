package policy

import (
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/summit/mdeg/internal/config"
	"github.com/summit/mdeg/internal/provider"
)

// Destination identifies a remote object storage target.
type Destination struct {
	Provider string `json:"provider"`
	Bucket   string `json:"bucket"`
	Region   string `json:"region"`
}

// TransferRequest is submitted by co-located services to request egress.
type TransferRequest struct {
	RequestID   string      `json:"requestId"`
	PolicyID    string      `json:"policyId"`
	Destination Destination `json:"destination"`
	DataClass   string      `json:"dataClass"`
	Bytes       int64       `json:"bytes"`
}

// EvaluationOutcome indicates the policy decision.
type EvaluationOutcome struct {
	Allowed    bool
	PolicyID   string
	Cost       float64
	Reason     string
	WindowEnds time.Time
}

// Policy encapsulates runtime metadata for enforcing a rule.
type Policy struct {
	cfg         config.PolicyConfig
	limiter     *TokenBucket
	mu          sync.Mutex
	windowStart time.Time
	bytesUsed   int64
	costUsed    float64
	calculator  provider.CostCalculator
}

// NewPolicy constructs an enforceable policy from configuration.
func NewPolicy(cfg config.PolicyConfig, calc provider.CostCalculator) (*Policy, error) {
	if cfg.ID == "" {
		return nil, errors.New("policy id is required")
	}
	if len(cfg.DataClasses) == 0 {
		return nil, fmt.Errorf("policy %s requires at least one data class", cfg.ID)
	}
	if len(cfg.Destinations) == 0 {
		return nil, fmt.Errorf("policy %s requires at least one destination", cfg.ID)
	}

	limiter := NewTokenBucket(cfg.RateLimit.BytesPerSecond, cfg.RateLimit.BurstBytes)

	return &Policy{
		cfg:         cfg,
		limiter:     limiter,
		windowStart: time.Now(),
		calculator:  calc,
	}, nil
}

// Matches verifies that the transfer attributes fall under the policy scope.
func (p *Policy) Matches(req TransferRequest) bool {
	if !containsInsensitive(p.cfg.DataClasses, req.DataClass) {
		return false
	}

	for _, dest := range p.cfg.Destinations {
		if strings.EqualFold(dest.Provider, req.Destination.Provider) &&
			(dest.Bucket == "" || strings.EqualFold(dest.Bucket, req.Destination.Bucket)) &&
			(dest.Region == "" || strings.EqualFold(dest.Region, req.Destination.Region)) {
			return true
		}
	}
	return false
}

func containsInsensitive(values []string, candidate string) bool {
	for _, value := range values {
		if strings.EqualFold(value, candidate) {
			return true
		}
	}
	return false
}

// Evaluate enforces rate, volume, and cost thresholds for the policy.
func (p *Policy) Evaluate(req TransferRequest) (EvaluationOutcome, error) {
	if req.Bytes <= 0 {
		return EvaluationOutcome{Allowed: false}, fmt.Errorf("bytes must be positive")
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	p.maybeResetWindow()

	if !p.limiter.Allow(req.Bytes) {
		return EvaluationOutcome{Allowed: false, PolicyID: p.cfg.ID, Reason: "rate limit exceeded", WindowEnds: p.windowStart.Add(p.cfg.DefaultWindow())}, nil
	}

	projectedBytes := p.bytesUsed + req.Bytes
	if p.cfg.MaxBytes > 0 && projectedBytes > p.cfg.MaxBytes {
		return EvaluationOutcome{Allowed: false, PolicyID: p.cfg.ID, Reason: "byte cap exceeded", WindowEnds: p.windowStart.Add(p.cfg.DefaultWindow())}, nil
	}

	cost, err := p.calculator.Cost(req.Destination.Provider, req.Bytes)
	if err != nil {
		return EvaluationOutcome{Allowed: false, PolicyID: p.cfg.ID, Reason: err.Error()}, nil
	}

	projectedCost := p.costUsed + cost
	if p.cfg.MaxCost > 0 && projectedCost > p.cfg.MaxCost {
		return EvaluationOutcome{Allowed: false, PolicyID: p.cfg.ID, Reason: "cost cap exceeded", WindowEnds: p.windowStart.Add(p.cfg.DefaultWindow())}, nil
	}

	p.bytesUsed = projectedBytes
	p.costUsed = projectedCost

	return EvaluationOutcome{
		Allowed:    true,
		PolicyID:   p.cfg.ID,
		Cost:       cost,
		WindowEnds: p.windowStart.Add(p.cfg.DefaultWindow()),
	}, nil
}

func (p *Policy) maybeResetWindow() {
	window := p.cfg.DefaultWindow()
	if time.Since(p.windowStart) >= window {
		p.windowStart = time.Now()
		p.bytesUsed = 0
		p.costUsed = 0
		p.limiter.Reset()
	}
}

// Snapshot exposes current accounting numbers for diagnostics.
func (p *Policy) Snapshot() (bytesUsed int64, costUsed float64, windowStart time.Time) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.bytesUsed, p.costUsed, p.windowStart
}
