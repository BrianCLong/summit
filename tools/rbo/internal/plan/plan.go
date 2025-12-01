package plan

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"sort"
	"time"

	"github.com/summit/rbo/internal/model"
)

// ActionType enumerates supported plan actions.
type ActionType string

const (
	ActionQuiesce  ActionType = "quiesce"
	ActionRollback ActionType = "rollback"
	ActionBackfill ActionType = "backfill"
	ActionResync   ActionType = "resync"
	ActionGuard    ActionType = "guardrail"
)

// PlanAction represents a single actionable step.
type PlanAction struct {
	ID         string            `json:"id"`
	Type       ActionType        `json:"type"`
	Target     model.ArtifactRef `json:"target"`
	Details    string            `json:"details"`
	Guardrails []string          `json:"guardrails,omitempty"`
}

// Stage encapsulates a group of ordered actions executed together.
type Stage struct {
	Name    string       `json:"name"`
	Actions []PlanAction `json:"actions"`
}

// RollbackPlan models a staged rollback execution plan.
type RollbackPlan struct {
	Targets     []model.ArtifactRef `json:"targets"`
	Stages      []Stage             `json:"stages"`
	CreatedAt   time.Time           `json:"createdAt"`
	Fingerprint string              `json:"fingerprint"`
}

// Normalize sorts stages and actions deterministically and recomputes the fingerprint.
func (p *RollbackPlan) Normalize() {
	sort.SliceStable(p.Targets, func(i, j int) bool {
		if p.Targets[i].Type == p.Targets[j].Type {
			return p.Targets[i].Name < p.Targets[j].Name
		}
		return p.Targets[i].Type < p.Targets[j].Type
	})
	for si := range p.Stages {
		stage := &p.Stages[si]
		sort.SliceStable(stage.Actions, func(i, j int) bool {
			if stage.Actions[i].Type == stage.Actions[j].Type {
				if stage.Actions[i].Target.Type == stage.Actions[j].Target.Type {
					if stage.Actions[i].Target.Name == stage.Actions[j].Target.Name {
						return stage.Actions[i].ID < stage.Actions[j].ID
					}
					return stage.Actions[i].Target.Name < stage.Actions[j].Target.Name
				}
				return stage.Actions[i].Target.Type < stage.Actions[j].Target.Type
			}
			return stage.Actions[i].Type < stage.Actions[j].Type
		})
	}
	sort.SliceStable(p.Stages, func(i, j int) bool { return p.Stages[i].Name < p.Stages[j].Name })
	p.Fingerprint = p.calculateFingerprint()
}

func (p *RollbackPlan) calculateFingerprint() string {
	normalized := struct {
		Targets []model.ArtifactRef `json:"targets"`
		Stages  []Stage             `json:"stages"`
	}{Targets: p.Targets, Stages: p.Stages}
	data, _ := json.Marshal(normalized)
	sum := sha1.Sum(data)
	return hex.EncodeToString(sum[:])
}

// DiffResult captures deterministic differences between two plans.
type DiffResult struct {
	OnlyInA []string `json:"onlyInA"`
	OnlyInB []string `json:"onlyInB"`
	Common  []string `json:"common"`
}

// Diff produces a deterministic diff summary between two plans.
func Diff(a, b RollbackPlan) DiffResult {
	a.Normalize()
	b.Normalize()
	sig := func(p RollbackPlan) []string {
		entries := make([]string, 0)
		for _, stage := range p.Stages {
			for _, action := range stage.Actions {
				entries = append(entries, stage.Name+"|"+string(action.Type)+"|"+string(action.Target.Type)+":"+action.Target.Name+"|"+action.Details)
			}
		}
		sort.Strings(entries)
		return entries
	}
	sigA := sig(a)
	sigB := sig(b)
	onlyA := difference(sigA, sigB)
	onlyB := difference(sigB, sigA)
	common := intersection(sigA, sigB)
	return DiffResult{OnlyInA: onlyA, OnlyInB: onlyB, Common: common}
}

func difference(a, b []string) []string {
	out := make([]string, 0)
	set := make(map[string]struct{}, len(b))
	for _, v := range b {
		set[v] = struct{}{}
	}
	for _, v := range a {
		if _, ok := set[v]; !ok {
			out = append(out, v)
		}
	}
	sort.Strings(out)
	return out
}

func intersection(a, b []string) []string {
	out := make([]string, 0)
	set := make(map[string]struct{}, len(b))
	for _, v := range b {
		set[v] = struct{}{}
	}
	seen := make(map[string]struct{})
	for _, v := range a {
		if _, ok := set[v]; ok {
			if _, dup := seen[v]; dup {
				continue
			}
			seen[v] = struct{}{}
			out = append(out, v)
		}
	}
	sort.Strings(out)
	return out
}
