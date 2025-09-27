package lho_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/summit/lho/internal/custody"
	"github.com/summit/lho/internal/diff"
	"github.com/summit/lho/internal/model"
	"github.com/summit/lho/internal/orchestrator"
	"github.com/summit/lho/internal/systems"
)

func TestHoldPreventsDeletes(t *testing.T) {
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

	ledger := &custody.Ledger{}
	torch := orchestrator.New([]systems.System{s3, postgres, kafka, elastic, lifecycle}, ledger)

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

	_, err := torch.IssueHold(ctx, req)
	require.NoError(t, err)

	require.Error(t, s3.DeleteObject("key-a"))
	require.Error(t, postgres.DeleteRow("events", "42"))
	require.Error(t, kafka.DeleteMessage("audit", 1))
	require.Error(t, elastic.DeleteDocument("logs", "doc-1"))

	lifecycle.ProcessExpirations(time.Now())
	require.NoError(t, lifecycle.Verify(ctx, scope))
}

func TestScopeDiffDeterministic(t *testing.T) {
	baseline := model.Scope{Systems: map[string][]string{
		"s3":       {"b", "a"},
		"postgres": {"events/2", "events/1"},
	}}

	updated := model.Scope{Systems: map[string][]string{
		"s3":       {"a", "c"},
		"postgres": {"events/1"},
	}}

	diffA := diff.Calculate(baseline, updated)
	diffB := diff.Calculate(baseline, updated)

	require.Equal(t, diffA, diffB)
	require.Equal(t, []string{"c"}, diffA.Added["s3"])
	require.Equal(t, []string{"b"}, diffA.Removed["s3"])
	require.Equal(t, []string{"a"}, diffA.Unchanged["s3"])
}

func TestCustodyProofVerification(t *testing.T) {
	ctx := context.Background()

	s3 := systems.NewS3Fixture("legal-holds", map[string]*systems.S3Object{
		"key-a": {Key: "key-a", Data: "version-a"},
	})
	postgres := systems.NewPostgresFixture(map[string]*systems.Table{
		"events": {Name: "events", Rows: map[string]*systems.Row{
			"42": {PrimaryKey: "42", Data: map[string]any{"case": "alpha"}},
		}},
	})

	ledger := &custody.Ledger{}
	torch := orchestrator.New([]systems.System{s3, postgres}, ledger)

	scope := model.Scope{Systems: map[string][]string{
		s3.Name():       {"key-a"},
		postgres.Name(): {"events/42"},
	}}

	req := orchestrator.HoldRequest{
		ID:         "hold-proof",
		Scope:      scope,
		Freeze:     true,
		PreventTTL: true,
		Window:     custody.Window{Start: time.Now(), End: time.Now().Add(1 * time.Hour)},
		Tags:       map[string]string{"case": "alpha"},
		Snapshot:   false,
	}

	_, err := torch.IssueHold(ctx, req)
	require.NoError(t, err)

	_, err = torch.VerifyHold(ctx, req)
	require.NoError(t, err)

	proof := torch.Ledger().ProofForHold("hold-proof")
	require.Len(t, proof, 4)
	require.NoError(t, custody.VerifyProof(proof))
}
