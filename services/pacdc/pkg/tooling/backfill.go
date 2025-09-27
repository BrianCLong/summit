package tooling

import (
	"context"

	"github.com/summit/pacdc/pkg/manifest"
	"github.com/summit/pacdc/pkg/replicator"
)

// BackfillResult captures the outcomes of a backfill run.
type BackfillResult struct {
	Manifest  *manifest.Manifest
	Positions map[string]string
}

// Backfill performs a snapshot-only replication run.
func Backfill(ctx context.Context, r *replicator.Replicator) (*BackfillResult, error) {
	if err := r.RunSnapshot(ctx); err != nil {
		return nil, err
	}
	return &BackfillResult{
		Manifest:  r.Manifest(),
		Positions: r.Positions(),
	}, nil
}

// Cutover consumes WAL changes from recorded positions.
func Cutover(ctx context.Context, r *replicator.Replicator, from map[string]string) (*manifest.Manifest, error) {
	if err := r.RunChanges(ctx, from); err != nil {
		return nil, err
	}
	return r.Manifest(), nil
}
