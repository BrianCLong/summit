package plan_test

import (
	"testing"
	"time"

	"github.com/summit/rbo/internal/model"
	"github.com/summit/rbo/internal/plan"
)

func TestDiffDeterministic(t *testing.T) {
	base := plan.RollbackPlan{
		Targets: []model.ArtifactRef{{Type: model.ArtifactModel, Name: "recommender"}},
		Stages: []plan.Stage{{
			Name: "10-rollback",
			Actions: []plan.PlanAction{{
				ID:      "a",
				Type:    plan.ActionRollback,
				Target:  model.ArtifactRef{Type: model.ArtifactModel, Name: "recommender"},
				Details: "restore v4",
			}, {
				ID:      "b",
				Type:    plan.ActionRollback,
				Target:  model.ArtifactRef{Type: model.ArtifactDataset, Name: "training"},
				Details: "restore 2024.08",
			}},
		}},
		CreatedAt: time.Now().UTC(),
	}
	other := base
	other.Stages[0].Actions[0], other.Stages[0].Actions[1] = other.Stages[0].Actions[1], other.Stages[0].Actions[0]
	diff := plan.Diff(base, other)
	if len(diff.OnlyInA) != 0 || len(diff.OnlyInB) != 0 {
		t.Fatalf("expected no diff, got %+v", diff)
	}
	if len(diff.Common) != 2 {
		t.Fatalf("expected 2 common entries")
	}
}
