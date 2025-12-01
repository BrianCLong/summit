package core

import (
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/summit/rbo/internal/model"
	"github.com/summit/rbo/internal/plan"
)

// ImpactSurface describes the result of an impact simulation.
type ImpactSurface struct {
	Artifact model.ArtifactRef `json:"artifact"`
	Role     string            `json:"role"`
	Notes    string            `json:"notes,omitempty"`
}

// ImpactReport aggregates simulation output.
type ImpactReport struct {
	Targets     []model.ArtifactRef `json:"targets"`
	Surfaces    []ImpactSurface     `json:"surfaces"`
	Summary     string              `json:"summary"`
	GeneratedAt time.Time           `json:"generatedAt"`
}

// Orchestrator coordinates rollback planning and execution.
type Orchestrator struct {
	state *SystemState
}

// NewOrchestrator constructs a new orchestrator for the given state.
func NewOrchestrator(state *SystemState) *Orchestrator {
	return &Orchestrator{state: state}
}

// State returns the underlying system state.
func (o *Orchestrator) State() *SystemState {
	return o.state
}

// SimulateImpact computes the downstream surfaces affected by rolling back the provided targets.
func (o *Orchestrator) SimulateImpact(targets []model.ArtifactRef) (ImpactReport, error) {
	if len(targets) == 0 {
		return ImpactReport{}, errors.New("at least one target required")
	}
	seen := map[model.ArtifactKey]ImpactSurface{}
	surfaces := make([]ImpactSurface, 0)
	for _, target := range targets {
		art, ok := o.state.Artifact(target)
		if !ok {
			return ImpactReport{}, fmt.Errorf("unknown target %s:%s", target.Type, target.Name)
		}
		key := model.MakeKey(target)
		surface := ImpactSurface{Artifact: target, Role: "target", Notes: fmt.Sprintf("current=%s lastGood=%s", art.CurrentVersion, art.LastGoodVersion)}
		seen[key] = surface
		surfaces = append(surfaces, surface)
		// include upstream dependencies
		var addDependencies func(string)
		addDependencies = func(node string) {
			for _, dep := range o.state.Graph.Dependencies(node) {
				depKey := model.ArtifactKey(dep)
				if _, ok := seen[depKey]; ok {
					continue
				}
				depRef := model.ParseKey(depKey)
				depArt := o.state.Artifacts[depKey]
				role := "dependency"
				if depArt.Type == model.ArtifactDataset {
					role = "dataset"
				}
				surface := ImpactSurface{Artifact: depRef, Role: role, Notes: fmt.Sprintf("provides inputs to %s:%s", target.Type, target.Name)}
				seen[depKey] = surface
				surfaces = append(surfaces, surface)
				addDependencies(dep)
			}
		}
		addDependencies(string(key))
		for _, dep := range o.state.Graph.Impact(string(key)) {
			if dep == string(key) {
				continue
			}
			ref := model.ParseKey(model.ArtifactKey(dep))
			depArt := o.state.Artifacts[model.ArtifactKey(dep)]
			role := "dependent"
			notes := fmt.Sprintf("depends on %s:%s current=%s", target.Type, target.Name, depArt.CurrentVersion)
			switch depArt.Type {
			case model.ArtifactCache:
				role = "cache"
			case model.ArtifactPolicy:
				role = "policy"
			case model.ArtifactDataset:
				role = "dataset"
			}
			if _, ok := seen[model.ArtifactKey(dep)]; ok {
				continue
			}
			surface := ImpactSurface{Artifact: ref, Role: role, Notes: notes}
			seen[model.ArtifactKey(dep)] = surface
			surfaces = append(surfaces, surface)
		}
	}
	sort.SliceStable(surfaces, func(i, j int) bool {
		if surfaces[i].Artifact.Type == surfaces[j].Artifact.Type {
			return surfaces[i].Artifact.Name < surfaces[j].Artifact.Name
		}
		return surfaces[i].Artifact.Type < surfaces[j].Artifact.Type
	})
	report := ImpactReport{Targets: targets, Surfaces: surfaces, Summary: fmt.Sprintf("%d surfaces impacted", len(surfaces)), GeneratedAt: time.Now().UTC()}
	return report, nil
}

// PlanRollback builds a staged rollback plan for the provided targets.
func (o *Orchestrator) PlanRollback(targets []model.ArtifactRef) (plan.RollbackPlan, error) {
	if len(targets) == 0 {
		return plan.RollbackPlan{}, errors.New("no targets provided")
	}
	impacted := map[model.ArtifactKey]*model.ArtifactState{}
	for _, target := range targets {
		art, ok := o.state.Artifact(target)
		if !ok {
			return plan.RollbackPlan{}, fmt.Errorf("unknown target %s:%s", target.Type, target.Name)
		}
		impacted[art.Key] = art
		for _, dep := range o.state.Graph.Impact(string(art.Key)) {
			impacted[model.ArtifactKey(dep)] = o.state.Artifacts[model.ArtifactKey(dep)]
		}
		var addDependencies func(string)
		addDependencies = func(node string) {
			for _, upstream := range o.state.Graph.Dependencies(node) {
				depKey := model.ArtifactKey(upstream)
				if _, exists := impacted[depKey]; exists {
					continue
				}
				impacted[depKey] = o.state.Artifacts[depKey]
				addDependencies(upstream)
			}
		}
		addDependencies(string(art.Key))
	}
	actionsByStage := map[string][]plan.PlanAction{
		"00-quiesce":  {},
		"10-rollback": {},
		"20-backfill": {},
		"30-resync":   {},
	}
	ensureActionID := func(prefix string, ref model.ArtifactRef) string {
		return fmt.Sprintf("%s:%s:%s", prefix, ref.Type, ref.Name)
	}
	for _, art := range impacted {
		ref := model.ArtifactRef{Type: art.Type, Name: art.Name}
		key := model.MakeKey(ref)
		if contains(targets, ref) {
			actionsByStage["00-quiesce"] = append(actionsByStage["00-quiesce"], plan.PlanAction{
				ID:      ensureActionID("quiesce", ref),
				Type:    plan.ActionQuiesce,
				Target:  ref,
				Details: "pause traffic and freeze mutations",
				Guardrails: []string{
					"confirm health-check drain complete",
					"snapshot metrics for rollback validation",
				},
			})
			actionsByStage["10-rollback"] = append(actionsByStage["10-rollback"], plan.PlanAction{
				ID:      ensureActionID("rollback", ref),
				Type:    plan.ActionRollback,
				Target:  ref,
				Details: fmt.Sprintf("restore version %s", art.LastGoodVersion),
				Guardrails: []string{
					fmt.Sprintf("verify artifact state matches %s prior snapshot", art.LastGoodVersion),
				},
			})
		} else {
			actionsByStage["00-quiesce"] = append(actionsByStage["00-quiesce"], plan.PlanAction{
				ID:      ensureActionID("shield", ref),
				Type:    plan.ActionQuiesce,
				Target:  ref,
				Details: fmt.Sprintf("shield dependent %s", key),
				Guardrails: []string{
					"confirm dependent drain complete",
				},
			})
			if art.CurrentVersion != art.LastGoodVersion && (art.Type == model.ArtifactDataset || art.Type == model.ArtifactCache || art.Type == model.ArtifactPolicy) {
				actionsByStage["10-rollback"] = append(actionsByStage["10-rollback"], plan.PlanAction{
					ID:      ensureActionID("rollback", ref),
					Type:    plan.ActionRollback,
					Target:  ref,
					Details: fmt.Sprintf("align dependent with version %s", art.LastGoodVersion),
					Guardrails: []string{
						"confirm dependency snapshot availability",
					},
				})
			}
		}
		if art.Type == model.ArtifactDataset && art.BackfillNeeded {
			actionsByStage["20-backfill"] = append(actionsByStage["20-backfill"], plan.PlanAction{
				ID:      ensureActionID("backfill", ref),
				Type:    plan.ActionBackfill,
				Target:  ref,
				Details: "run dataset backfill to align with restored state",
				Guardrails: []string{
					"validate snapshot availability",
					"checksum restored partitions",
				},
			})
		}
		if art.Type == model.ArtifactCache || art.Type == model.ArtifactPolicy {
			actionsByStage["30-resync"] = append(actionsByStage["30-resync"], plan.PlanAction{
				ID:      ensureActionID("resync", ref),
				Type:    plan.ActionResync,
				Target:  ref,
				Details: "resync derived state with rolled back sources",
				Guardrails: []string{
					"verify dependency versions align",
				},
			})
		}
	}

	stages := make([]plan.Stage, 0)
	for _, name := range []string{"00-quiesce", "10-rollback", "20-backfill", "30-resync"} {
		if len(actionsByStage[name]) == 0 {
			continue
		}
		stage := plan.Stage{Name: name, Actions: actionsByStage[name]}
		stages = append(stages, stage)
	}
	rollback := plan.RollbackPlan{Targets: append([]model.ArtifactRef(nil), targets...), Stages: stages, CreatedAt: time.Now().UTC()}
	rollback.Normalize()
	return rollback, nil
}

// Execute applies the provided rollback plan to the orchestrator state.
func (o *Orchestrator) Execute(p plan.RollbackPlan) error {
	if len(p.Stages) == 0 {
		return errors.New("plan has no stages")
	}
	for _, stage := range p.Stages {
		for _, action := range stage.Actions {
			art, ok := o.state.Artifact(action.Target)
			if !ok {
				return fmt.Errorf("unknown artifact in plan: %s:%s", action.Target.Type, action.Target.Name)
			}
			switch action.Type {
			case plan.ActionRollback:
				art.CurrentVersion = art.LastGoodVersion
				if art.Type == model.ArtifactCache || art.Type == model.ArtifactPolicy {
					art.SyncedVersion = art.LastGoodVersion
				}
				art.BackfillNeeded = false
			case plan.ActionBackfill:
				art.BackfillNeeded = false
				art.SyncedVersion = art.LastGoodVersion
			case plan.ActionResync:
				deps := o.state.Graph.Dependencies(string(art.Key))
				if len(deps) == 0 {
					art.SyncedVersion = art.LastGoodVersion
				} else {
					versions := make([]string, 0, len(deps))
					for _, dep := range deps {
						versions = append(versions, o.state.Artifacts[model.ArtifactKey(dep)].CurrentVersion)
					}
					sort.Strings(versions)
					art.SyncedVersion = versions[len(versions)-1]
				}
			case plan.ActionQuiesce, plan.ActionGuard:
			default:
				return fmt.Errorf("unsupported action type %s", action.Type)
			}
		}
	}
	return o.validateNoOrphans()
}

func (o *Orchestrator) validateNoOrphans() error {
	for key, art := range o.state.Artifacts {
		deps := o.state.Graph.Dependencies(string(key))
		if len(deps) == 0 {
			continue
		}
		if art.Type == model.ArtifactCache || art.Type == model.ArtifactPolicy {
			expected := make([]string, 0, len(deps))
			for _, dep := range deps {
				expected = append(expected, o.state.Artifacts[model.ArtifactKey(dep)].CurrentVersion)
			}
			sort.Strings(expected)
			if art.SyncedVersion != expected[len(expected)-1] {
				return fmt.Errorf("orphaned %s:%s not synced with dependencies", art.Type, art.Name)
			}
		}
	}
	return nil
}

// FastUndo creates a guard-railed fast path rollback plan.
func (o *Orchestrator) FastUndo(target model.ArtifactRef) (plan.RollbackPlan, error) {
	art, ok := o.state.Artifact(target)
	if !ok {
		return plan.RollbackPlan{}, fmt.Errorf("unknown target %s:%s", target.Type, target.Name)
	}
	if art.CurrentVersion == art.LastGoodVersion {
		return plan.RollbackPlan{}, fmt.Errorf("target %s:%s already at last good version", target.Type, target.Name)
	}
	planBase, err := o.PlanRollback([]model.ArtifactRef{target})
	if err != nil {
		return plan.RollbackPlan{}, err
	}
	guardrails := []plan.PlanAction{
		{
			ID:      "guard:change-window",
			Type:    plan.ActionGuard,
			Target:  target,
			Details: "validate change window approval",
			Guardrails: []string{
				"ticket approved",
				"pager rotation acknowledged",
			},
		},
		{
			ID:      "guard:state-drift",
			Type:    plan.ActionGuard,
			Target:  target,
			Details: "verify no configuration drift since last deploy",
			Guardrails: []string{
				"config hash matches known good",
			},
		},
	}
	planBase.Stages = append([]plan.Stage{{Name: "-10-fast-undo-guardrails", Actions: guardrails}}, planBase.Stages...)
	planBase.Normalize()
	return planBase, nil
}

func contains(refs []model.ArtifactRef, ref model.ArtifactRef) bool {
	for _, r := range refs {
		if r.Type == ref.Type && r.Name == ref.Name {
			return true
		}
	}
	return false
}
