package main

import (
	"context"
	"encoding/json"
	"os"
	"time"

	"github.com/summit/lho/internal/custody"
	"github.com/summit/lho/internal/diff"
	"github.com/summit/lho/internal/model"
	"github.com/summit/lho/internal/orchestrator"
	"github.com/summit/lho/internal/systems"
)

func main() {
	ctx := context.Background()

	s3 := systems.NewS3Fixture("legal-holds", map[string]*systems.S3Object{
		"key-a": {Key: "key-a", Data: "version-a"},
		"key-b": {Key: "key-b", Data: "version-b"},
	})

	postgres := systems.NewPostgresFixture(map[string]*systems.Table{
		"events": {Name: "events", Rows: map[string]*systems.Row{
			"42": {PrimaryKey: "42", Data: map[string]any{"case": "alpha"}},
		}},
	})

	kafka := systems.NewKafkaFixture(map[string]*systems.KafkaTopic{
		"audit": {Name: "audit", Messages: map[int]*systems.KafkaMessage{
			1: {Offset: 1, Payload: "event"},
		}},
	})

	elastic := systems.NewElasticsearchFixture(map[string]*systems.Index{
		"logs": {Name: "logs", Docs: map[string]*systems.Document{
			"doc-1": {ID: "doc-1", Data: map[string]any{"event": "alpha"}},
		}},
	})

	lifecycle := systems.NewLifecycleFixture(map[string]*systems.LifecycleObject{
		"session-9": {ID: "session-9", ExpiresAt: time.Now().Add(-1 * time.Hour)},
	})

	systemsList := []systems.System{s3, postgres, kafka, elastic, lifecycle}
	ledger := &custody.Ledger{}
	orch := orchestrator.New(systemsList, ledger)

	scope := model.Scope{Systems: map[string][]string{
		s3.Name():        {"key-a", "key-b"},
		postgres.Name():  {"events/42"},
		kafka.Name():     {"audit:1"},
		elastic.Name():   {"logs/doc-1"},
		lifecycle.Name(): {"session-9"},
	}}

	req := orchestrator.HoldRequest{
		ID:         "hold-123",
		Scope:      scope,
		Freeze:     true,
		Snapshot:   true,
		PreventTTL: true,
		Tags: map[string]string{
			"lho": "active",
		},
		Window: custody.Window{Start: time.Now().Add(-1 * time.Hour), End: time.Now().Add(1 * time.Hour)},
	}

	result, err := orch.IssueHold(ctx, req)
	if err != nil {
		panic(err)
	}

	if _, err := orch.VerifyHold(ctx, req); err != nil {
		panic(err)
	}

	type report struct {
		System          string                       `json:"system"`
		FrozenResources []string                     `json:"frozenResources"`
		Snapshotted     []string                     `json:"snapshotted"`
		Tagged          map[string]map[string]string `json:"tagged"`
	}

	reports := make([]report, 0, len(result.Reports))
	for system, r := range result.Reports {
		reports = append(reports, report{
			System:          system,
			FrozenResources: append([]string(nil), r.FrozenResources...),
			Snapshotted:     append([]string(nil), r.Snapshotted...),
			Tagged:          r.Tagged,
		})
	}

	scopeDiff := diff.Calculate(model.Scope{Systems: map[string][]string{}}, scope)

	output := map[string]any{
		"holdId":       req.ID,
		"issuedAt":     time.Now().UTC().Format(time.RFC3339),
		"window":       req.Window,
		"scope":        scope.Systems,
		"scopeDiff":    scopeDiff,
		"custodyChain": orch.Ledger().ProofForHold(req.ID),
		"reports":      reports,
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(output); err != nil {
		panic(err)
	}
}
