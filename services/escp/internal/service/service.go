package service

import (
	"context"
	"fmt"

	"github.com/summit/escp/internal/agents"
	"github.com/summit/escp/internal/proof"
	"github.com/summit/escp/internal/sla"
)

// Request instructs the service to perform an erasure or dry-run.
type Request struct {
	SubjectID string   `json:"subjectId"`
	Systems   []string `json:"systems"`
	DryRun    bool     `json:"dryRun"`
}

// Response is returned by the orchestrator.
type Response struct {
	SubjectID string                 `json:"subjectId"`
	DryRun    map[string][]string    `json:"dryRun"`
	Proofs    []proof.SystemProof    `json:"proofs,omitempty"`
	SLA       map[string]sla.Metrics `json:"sla"`
}

// Service wires agents together with the SLA tracker.
type Service struct {
	agents  map[string]agents.Agent
	tracker *sla.Tracker
}

// New constructs a service.
func New(agentList []agents.Agent, tracker *sla.Tracker) *Service {
	registry := make(map[string]agents.Agent, len(agentList))
	for _, agent := range agentList {
		registry[agent.Name()] = agent
	}
	if tracker == nil {
		tracker = sla.NewTracker()
	}
	return &Service{agents: registry, tracker: tracker}
}

// Process runs the request to completion.
func (s *Service) Process(ctx context.Context, req Request) (Response, error) {
	if req.SubjectID == "" {
		return Response{}, fmt.Errorf("subjectId is required")
	}
	systems := req.Systems
	if len(systems) == 0 {
		systems = make([]string, 0, len(s.agents))
		for name := range s.agents {
			systems = append(systems, name)
		}
	}

	dryRun := make(map[string][]string, len(systems))
	var proofs []proof.SystemProof

	for _, system := range systems {
		agent, ok := s.agents[system]
		if !ok {
			return Response{}, fmt.Errorf("unknown system %s", system)
		}
		dr, err := agent.DryRun(ctx, req.SubjectID)
		if err != nil {
			return Response{}, fmt.Errorf("dry-run %s: %w", system, err)
		}
		dryRun[system] = dr.Keys
		if req.DryRun {
			continue
		}
		exec, err := agent.Execute(ctx, req.SubjectID)
		if err != nil {
			return Response{}, fmt.Errorf("execute %s: %w", system, err)
		}
		if len(exec.Keys) != len(dr.Keys) {
			return Response{}, fmt.Errorf("dry-run mismatch for %s", system)
		}
		for i := range exec.Keys {
			if exec.Keys[i] != dr.Keys[i] {
				return Response{}, fmt.Errorf("dry-run mismatch for %s", system)
			}
		}
		proofs = append(proofs, exec.Proof)
		s.tracker.Record(system, float64(exec.Duration.Milliseconds()))
	}

	return Response{
		SubjectID: req.SubjectID,
		DryRun:    dryRun,
		Proofs:    proofs,
		SLA:       s.tracker.Report(),
	}, nil
}

// SLAReport returns the most recent SLA snapshot.
func (s *Service) SLAReport() map[string]sla.Metrics {
	return s.tracker.Report()
}
