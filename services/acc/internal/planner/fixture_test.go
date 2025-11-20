package planner_test

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/summit/acc/internal/config"
	"github.com/summit/acc/internal/planner"
)

type fixtureStep struct {
	Type    string           `json:"type"`
	Request *planner.Request `json:"request,omitempty"`
	Expect  *struct {
		Mode                config.Mode `json:"mode"`
		Quorum              []string    `json:"quorum"`
		FallbackToStrong    bool        `json:"fallbackToStrong"`
		MaxReplicaStaleness int         `json:"maxReplicaStaleness"`
	} `json:"expect,omitempty"`
	Update *struct {
		Name        string `json:"name"`
		LatencyMs   int    `json:"latencyMs"`
		StalenessMs int    `json:"stalenessMs"`
	} `json:"update,omitempty"`
}

type fixture struct {
	Description string        `json:"description"`
	Steps       []fixtureStep `json:"steps"`
}

func TestFixturesReplay(t *testing.T) {
	fixtures, err := filepath.Glob(filepath.Join("..", "..", "fixtures", "*.json"))
	if err != nil {
		t.Fatalf("glob fixtures: %v", err)
	}
	if len(fixtures) == 0 {
		t.Fatalf("no fixtures discovered")
	}

	cfg := loadConfig(t)

	for _, path := range fixtures {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read fixture %s: %v", path, err)
		}
		var fx fixture
		if err := json.Unmarshal(data, &fx); err != nil {
			t.Fatalf("parse fixture %s: %v", path, err)
		}

		t.Run(filepath.Base(path), func(t *testing.T) {
			pl := planner.New(cfg)
			for _, step := range fx.Steps {
				switch step.Type {
				case "update":
					if step.Update == nil {
						t.Fatalf("update step missing payload")
					}
					if err := pl.UpdateReplica(step.Update.Name, planner.ReplicaMetrics{
						LatencyMs:   step.Update.LatencyMs,
						StalenessMs: step.Update.StalenessMs,
					}); err != nil {
						t.Fatalf("update replica: %v", err)
					}
				case "plan":
					if step.Request == nil || step.Expect == nil {
						t.Fatalf("plan step missing request or expectation")
					}
					result, err := pl.Plan(context.Background(), *step.Request)
					if err != nil {
						t.Fatalf("plan: %v", err)
					}
					if result.Mode != step.Expect.Mode {
						t.Fatalf("expected mode %s, got %s", step.Expect.Mode, result.Mode)
					}
					if step.Expect.Quorum != nil {
						if len(step.Expect.Quorum) != len(result.Route.Quorum) {
							t.Fatalf("expected quorum %v, got %v", step.Expect.Quorum, result.Route.Quorum)
						}
						for i := range step.Expect.Quorum {
							if result.Route.Quorum[i] != step.Expect.Quorum[i] {
								t.Fatalf("expected quorum %v, got %v", step.Expect.Quorum, result.Route.Quorum)
							}
						}
					}
					if result.Route.FallbackToStrongMode != step.Expect.FallbackToStrong {
						t.Fatalf("expected fallback=%v, got %v", step.Expect.FallbackToStrong, result.Route.FallbackToStrongMode)
					}
					if step.Expect.MaxReplicaStaleness > 0 {
						for _, replica := range result.Route.Replicas {
							if replica.StalenessMs > step.Expect.MaxReplicaStaleness {
								t.Fatalf("replica %s staleness %d > %d", replica.Name, replica.StalenessMs, step.Expect.MaxReplicaStaleness)
							}
						}
					}
				default:
					t.Fatalf("unknown step type %s", step.Type)
				}
			}
		})
	}
}
