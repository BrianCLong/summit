package replicator_test

import (
	"context"
	"fmt"
	"sort"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/summit/pacdc/pkg/config"
	"github.com/summit/pacdc/pkg/policy"
	"github.com/summit/pacdc/pkg/replicator"
	"github.com/summit/pacdc/pkg/source"
	"github.com/summit/pacdc/pkg/target"
	"github.com/summit/pacdc/pkg/tooling"
)

func TestReplicationWithPolicies(t *testing.T) {
	ctx := context.Background()
	cfg := config.Config{
		Streams: []config.StreamConfig{
			{
				Name:       "orders",
				Schema:     "public",
				Table:      "orders",
				PrimaryKey: []string{"id"},
				Tags:       map[string]string{"domain": "commerce"},
				Policy:     "orders-policy",
			},
		},
		Policies: map[string]config.PolicyConfig{
			"orders-policy": {
				Columns: []config.ColumnPolicy{
					{Column: "id", Action: "allow"},
					{Column: "status", Action: "allow"},
					{Column: "region", Action: "allow"},
					{Column: "total", Action: "allow"},
					{Column: "customer_ssn", Action: "redact"},
					{Column: "internal_notes", Action: "deny"},
				},
				RowFilters: []config.RowFilter{
					{Column: "status", Operator: "eq", Value: "active"},
				},
				Jurisdictions: []config.JurisdictionRule{
					{Column: "region", Allowed: []string{"US", "EU"}},
				},
			},
		},
		Source: config.SourceConfig{},
		Targets: []config.TargetConfig{
			{Type: "s3", S3: &config.S3Config{Bucket: "test", Prefix: "orders"}},
			{Type: "bigquery", BigQuery: &config.BigQueryConfig{ProjectID: "demo", Dataset: "analytics", Table: "orders"}},
		},
	}

	buildSource := func() *source.FakeSource {
		src := source.NewFakeSource()
		snapshotRows := []map[string]any{
			{"id": 1, "status": "active", "region": "US", "total": 100.0, "customer_ssn": "123-45-6789", "internal_notes": "VIP"},
			{"id": 2, "status": "inactive", "region": "US", "total": 90.0, "customer_ssn": "000-00-0000"},
			{"id": 3, "status": "active", "region": "CN", "total": 50.0, "customer_ssn": "999-99-9999"},
		}
		src.SetSnapshot("orders", snapshotRows, "0/1")
		src.AppendChange("orders", replicator.ChangeEvent{Type: replicator.ChangeTypeUpdate, NewValues: map[string]any{"id": 1, "status": "active", "region": "US", "total": 150.0, "customer_ssn": "123-45-6789"}})
		src.AppendChange("orders", replicator.ChangeEvent{Type: replicator.ChangeTypeInsert, NewValues: map[string]any{"id": 4, "status": "active", "region": "EU", "total": 200.0, "customer_ssn": "222-33-4444"}})
		src.AppendChange("orders", replicator.ChangeEvent{Type: replicator.ChangeTypeDelete, OldValues: map[string]any{"id": 2, "status": "inactive", "region": "US"}})
		return src
	}

	// Direct replication for comparison.
	directS3 := target.NewS3Target(config.S3Config{Bucket: "direct", Prefix: "orders"})
	directBQ := target.NewBigQueryTarget(config.BigQueryConfig{ProjectID: "demo", Dataset: "analytics", Table: "orders"})
	directRep, err := replicator.New(cfg, buildSource(), []replicator.Target{directS3, directBQ}, policy.NewEngine(cfg.Policies))
	require.NoError(t, err)
	require.NoError(t, directRep.RunSnapshot(ctx))
	require.NoError(t, directRep.RunChanges(ctx, nil))

	// Backfill + cutover pipeline.
	stagedS3 := target.NewS3Target(config.S3Config{Bucket: "stage", Prefix: "orders"})
	stagedBQ := target.NewBigQueryTarget(config.BigQueryConfig{ProjectID: "demo", Dataset: "analytics", Table: "orders"})
	stagedRep, err := replicator.New(cfg, buildSource(), []replicator.Target{stagedS3, stagedBQ}, policy.NewEngine(cfg.Policies))
	require.NoError(t, err)
	backfillResult, err := tooling.Backfill(ctx, stagedRep)
	require.NoError(t, err)
	require.Contains(t, backfillResult.Positions, "orders")
	require.Equal(t, 1, backfillResult.Manifest.Streams["orders"].SnapshotCount)
	// Snapshot should have only allowed row and redacted data.
	expectedSnapshot := []map[string]any{{
		"customer_ssn": "[REDACTED]",
		"id":           1,
		"region":       "US",
		"status":       "active",
		"total":        100.0,
	}}
	require.Equal(t, canonical(expectedSnapshot), canonical(stagedS3.Export("orders")))

	manifestBeforeCutover := backfillResult.Manifest.Streams["orders"]
	require.Zero(t, manifestBeforeCutover.InsertCount)
	require.Equal(t, backfillResult.Manifest.PolicyHash, stagedRep.Manifest().PolicyHash)

	cutoverManifest, err := tooling.Cutover(ctx, stagedRep, backfillResult.Positions)
	require.NoError(t, err)
	streamManifest := cutoverManifest.Streams["orders"]
	require.Equal(t, 1, streamManifest.SnapshotCount)
	require.Equal(t, 1, streamManifest.InsertCount)
	require.Equal(t, 1, streamManifest.UpdateCount)
	require.Zero(t, streamManifest.DeleteCount)

	// Final state should equal direct replication outputs.
	require.Equal(t, canonical(directS3.Export("orders")), canonical(stagedS3.Export("orders")))
	require.Equal(t, canonical(directBQ.Export("orders")), canonical(stagedBQ.Export("orders")))
}

func canonical(rows []map[string]any) []map[string]any {
	copied := make([]map[string]any, len(rows))
	for i, row := range rows {
		cp := make(map[string]any, len(row))
		for k, v := range row {
			cp[k] = v
		}
		copied[i] = cp
	}
	sort.Slice(copied, func(i, j int) bool {
		return fmt.Sprint(copied[i]["id"]) < fmt.Sprint(copied[j]["id"])
	})
	return copied
}
