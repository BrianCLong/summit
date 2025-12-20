package core_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/summit/rbo/internal/core"
	"github.com/summit/rbo/internal/model"
	"github.com/summit/rbo/internal/plan"
)

func loadTestState(t *testing.T) *core.SystemState {
	t.Helper()
	path := filepath.Join("..", "..", "testdata", "sample_state.json")
	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open state: %v", err)
	}
	defer f.Close()
	state, err := core.LoadState(f)
	if err != nil {
		t.Fatalf("load state: %v", err)
	}
	return state
}

func TestSimulateImpact(t *testing.T) {
	state := loadTestState(t)
	o := core.NewOrchestrator(state)
	report, err := o.SimulateImpact([]model.ArtifactRef{{Type: model.ArtifactModel, Name: "recommender"}})
	if err != nil {
		t.Fatalf("simulate: %v", err)
	}
	if len(report.Surfaces) != 4 {
		t.Fatalf("expected 4 surfaces, got %d", len(report.Surfaces))
	}
	found := map[model.ArtifactType]bool{}
	for _, surface := range report.Surfaces {
		found[surface.Artifact.Type] = true
	}
	for _, typ := range []model.ArtifactType{model.ArtifactModel, model.ArtifactDataset, model.ArtifactPolicy, model.ArtifactCache} {
		if !found[typ] {
			t.Fatalf("missing impacted type %s", typ)
		}
	}
}

func TestPlanRollbackIncludesStagedActions(t *testing.T) {
	state := loadTestState(t)
	o := core.NewOrchestrator(state)
	planObj, err := o.PlanRollback([]model.ArtifactRef{{Type: model.ArtifactModel, Name: "recommender"}})
	if err != nil {
		t.Fatalf("plan: %v", err)
	}
	expectedStages := []string{"00-quiesce", "10-rollback", "20-backfill", "30-resync"}
	if len(planObj.Stages) != len(expectedStages) {
		t.Fatalf("expected %d stages got %d", len(expectedStages), len(planObj.Stages))
	}
	for i, stage := range planObj.Stages {
		if stage.Name != expectedStages[i] {
			t.Fatalf("stage %d expected %s got %s", i, expectedStages[i], stage.Name)
		}
	}
	// ensure dataset rollback action present
	foundDataset := false
	for _, stage := range planObj.Stages {
		if stage.Name == "10-rollback" {
			for _, action := range stage.Actions {
				if action.Target.Type == model.ArtifactDataset {
					foundDataset = true
				}
			}
		}
	}
	if !foundDataset {
		t.Fatalf("expected dataset rollback action")
	}
}

func TestExecuteRestoresLastGoodState(t *testing.T) {
	state := loadTestState(t)
	o := core.NewOrchestrator(state)
	planObj, err := o.PlanRollback([]model.ArtifactRef{{Type: model.ArtifactModel, Name: "recommender"}})
	if err != nil {
		t.Fatalf("plan: %v", err)
	}
	if err := o.Execute(planObj); err != nil {
		t.Fatalf("execute: %v", err)
	}
	mdl, _ := o.State().Artifact(model.ArtifactRef{Type: model.ArtifactModel, Name: "recommender"})
	if mdl.CurrentVersion != mdl.LastGoodVersion {
		t.Fatalf("model not restored: %s != %s", mdl.CurrentVersion, mdl.LastGoodVersion)
	}
	dataset, _ := o.State().Artifact(model.ArtifactRef{Type: model.ArtifactDataset, Name: "training-corpus"})
	if dataset.CurrentVersion != dataset.LastGoodVersion {
		t.Fatalf("dataset not restored: %s != %s", dataset.CurrentVersion, dataset.LastGoodVersion)
	}
	if dataset.BackfillNeeded {
		t.Fatalf("dataset still requires backfill")
	}
	cache, _ := o.State().Artifact(model.ArtifactRef{Type: model.ArtifactCache, Name: "reco-serving"})
	if cache.SyncedVersion != mdl.CurrentVersion {
		t.Fatalf("cache not resynced: %s != %s", cache.SyncedVersion, mdl.CurrentVersion)
	}
}

func TestFastUndoAddsGuardrails(t *testing.T) {
	state := loadTestState(t)
	o := core.NewOrchestrator(state)
	planObj, err := o.FastUndo(model.ArtifactRef{Type: model.ArtifactModel, Name: "recommender"})
	if err != nil {
		t.Fatalf("fast undo: %v", err)
	}
	if len(planObj.Stages) == 0 || planObj.Stages[0].Name != "-10-fast-undo-guardrails" {
		t.Fatalf("expected guardrail stage first, got %+v", planObj.Stages)
	}
	if len(planObj.Stages[0].Actions) == 0 {
		t.Fatalf("expected guardrail actions")
	}
	// ensure serialization is stable
	buf, err := json.Marshal(planObj)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if len(buf) == 0 {
		t.Fatalf("empty serialization")
	}
}

func TestExecuteRejectsUnknownArtifact(t *testing.T) {
	state := loadTestState(t)
	o := core.NewOrchestrator(state)
	planObj := plan.RollbackPlan{
		Targets: []model.ArtifactRef{{Type: model.ArtifactModel, Name: "ghost"}},
		Stages: []plan.Stage{{
			Name: "10-rollback",
			Actions: []plan.PlanAction{{
				Type:   plan.ActionRollback,
				Target: model.ArtifactRef{Type: model.ArtifactModel, Name: "ghost"},
			}},
		}},
	}
	if err := o.Execute(planObj); err == nil {
		t.Fatalf("expected error for unknown artifact")
	}
}
