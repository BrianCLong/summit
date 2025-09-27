package mpes

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Runner orchestrates sandboxed evaluation of submissions across multiple parties.
type Runner struct {
	tasks  []EvalTask
	policy PolicyFirewall
	signer *ScorecardSigner
	clock  func() time.Time
}

// RunnerOption configures runner construction.
type RunnerOption func(*Runner)

// WithClock overrides the default time source (useful for testing).
func WithClock(clock func() time.Time) RunnerOption {
	return func(r *Runner) {
		r.clock = clock
	}
}

// NewRunner creates a runner with the provided tasks, policy firewall, and signer.
func NewRunner(tasks []EvalTask, policy PolicyFirewall, signer *ScorecardSigner, opts ...RunnerOption) (*Runner, error) {
	if len(tasks) == 0 {
		return nil, fmt.Errorf("runner requires at least one task")
	}
	if policy == nil {
		return nil, fmt.Errorf("runner requires a policy firewall")
	}
	if signer == nil {
		return nil, fmt.Errorf("runner requires a scorecard signer")
	}
	runner := &Runner{
		tasks:  append([]EvalTask(nil), tasks...),
		policy: policy,
		signer: signer,
		clock:  time.Now,
	}
	for _, opt := range opts {
		opt(runner)
	}
	return runner, nil
}

// Run executes the configured tasks for each submission in isolated sandboxes.
func (r *Runner) Run(ctx context.Context, submissions []Submission) (map[string]Scorecard, error) {
	if len(submissions) == 0 {
		return map[string]Scorecard{}, nil
	}

	results := make(map[string]Scorecard)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errors := make(chan error, len(submissions))

	for _, submission := range submissions {
		submission := submission
		wg.Add(1)
		go func() {
			defer wg.Done()
			sandbox, err := newSandbox(submission.PartyID, r.policy)
			if err != nil {
				errors <- err
				return
			}
			taskScores, err := sandbox.Execute(ctx, r.tasks, submission)
			if err != nil {
				errors <- err
				return
			}
			scorecard := Scorecard{
				PartyID:    submission.PartyID,
				TaskScores: taskScores,
				Metadata:   sandbox.Metadata(),
				CreatedAt:  r.clock(),
			}
			if err := r.signer.SignScorecard(&scorecard); err != nil {
				errors <- err
				return
			}
			mu.Lock()
			results[submission.PartyID] = scorecard
			mu.Unlock()
		}()
	}

	wg.Wait()
	close(errors)
	for err := range errors {
		if err != nil {
			return nil, err
		}
	}
	return results, nil
}
