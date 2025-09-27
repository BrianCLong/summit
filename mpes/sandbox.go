package mpes

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

// Sandbox represents an ephemeral execution environment for a party submission.
type Sandbox struct {
	id     string
	party  string
	policy PolicyFirewall
}

// newSandbox builds an isolated sandbox per submission.
func newSandbox(partyID string, policy PolicyFirewall) (*Sandbox, error) {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return nil, fmt.Errorf("failed to seed sandbox id: %w", err)
	}
	return &Sandbox{
		id:     hex.EncodeToString(buf),
		party:  partyID,
		policy: policy,
	}, nil
}

// Execute runs all tasks against the isolated copies of the submission artifacts.
func (s *Sandbox) Execute(ctx context.Context, tasks []EvalTask, submission Submission) (map[string]Score, error) {
	if err := s.policy.Enforce(submission.PartyID, submission.Model.Capabilities); err != nil {
		return nil, err
	}
	safeModel := submission.Model.Clone()
	safeData := submission.Data.Clone()
	results := make(map[string]Score, len(tasks))
	for _, task := range tasks {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}
		score, err := task.Evaluate(safeModel, safeData)
		if err != nil {
			return nil, fmt.Errorf("task %s failed in sandbox %s: %w", task.Name(), s.id, err)
		}
		results[task.Name()] = score
	}
	return results, nil
}

// Metadata returns sandbox details safe to share with the caller.
func (s *Sandbox) Metadata() map[string]string {
	return map[string]string{
		"sandbox_id": s.id,
		"party":      s.party,
	}
}
