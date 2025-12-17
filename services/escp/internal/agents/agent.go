package agents

import (
	"context"
	"fmt"
	"time"

	"github.com/summit/escp/internal/backends"
	"github.com/summit/escp/internal/proof"
)

// DryRunResult enumerates the keys that would be erased.
type DryRunResult struct {
	System string
	Keys   []string
}

// ExecutionResult captures the outcome of a deletion pass.
type ExecutionResult struct {
	System   string
	Keys     []string
	Proof    proof.SystemProof
	Duration time.Duration
}

// Agent orchestrates erasure for a specific data system.
type Agent interface {
	Name() string
	DryRun(ctx context.Context, subject string) (DryRunResult, error)
	Execute(ctx context.Context, subject string) (ExecutionResult, error)
}

// Config drives creation of a concrete erasure agent.
type Config struct {
	System         string
	Classification string
	Backend        backends.Backend
}

type genericAgent struct {
	system         string
	classification string
	backend        backends.Backend
}

// New creates an erasure agent backed by the provided backend.
func New(cfg Config) (Agent, error) {
	if cfg.Backend == nil {
		return nil, fmt.Errorf("backend is required for system %s", cfg.System)
	}
	if cfg.Classification == "" {
		return nil, fmt.Errorf("classification must be provided for system %s", cfg.System)
	}
	return &genericAgent{
		system:         cfg.System,
		classification: cfg.Classification,
		backend:        cfg.Backend,
	}, nil
}

func (g *genericAgent) Name() string {
	return g.system
}

func (g *genericAgent) DryRun(ctx context.Context, subject string) (DryRunResult, error) {
	records, err := g.backend.ListKeys(subject)
	if err != nil {
		return DryRunResult{}, fmt.Errorf("list keys: %w", err)
	}
	keys := make([]string, len(records))
	for i, r := range records {
		keys[i] = r.Key
	}
	return DryRunResult{System: g.system, Keys: keys}, nil
}

func (g *genericAgent) Execute(ctx context.Context, subject string) (ExecutionResult, error) {
	start := time.Now()
	records, err := g.backend.ListKeys(subject)
	if err != nil {
		return ExecutionResult{}, fmt.Errorf("list keys: %w", err)
	}
	keys := make([]string, len(records))
	for i, r := range records {
		keys[i] = r.Key
	}
	if err := g.backend.DeleteKeys(keys); err != nil {
		return ExecutionResult{}, fmt.Errorf("delete keys: %w", err)
	}

	duration := time.Since(start)
	proofPayload := proof.SystemProof{
		System:         g.system,
		Classification: g.classification,
		Keys:           keys,
	}

	switch g.classification {
	case "cache":
		negative, err := proof.BuildNegativeProofs(keys)
		if err != nil {
			return ExecutionResult{}, fmt.Errorf("build negative proofs: %w", err)
		}
		proofPayload.NegativeProofs = negative
	default:
		tree := proof.BuildMerkle(keys)
		proofPayload.Merkle = &tree
	}

	return ExecutionResult{
		System:   g.system,
		Keys:     keys,
		Proof:    proofPayload,
		Duration: duration,
	}, nil
}
