package replicator

import (
	"context"
	"fmt"
	"sync"

	"github.com/summit/pacdc/pkg/config"
	"github.com/summit/pacdc/pkg/manifest"
	"github.com/summit/pacdc/pkg/policy"
)

// ChangeType enumerates WAL change actions.
type ChangeType string

const (
	ChangeTypeInsert   ChangeType = "insert"
	ChangeTypeUpdate   ChangeType = "update"
	ChangeTypeDelete   ChangeType = "delete"
	ChangeTypeSnapshot ChangeType = "snapshot"
)

// ChangeEvent represents a change from the source.
type ChangeEvent struct {
	Stream    string
	Type      ChangeType
	NewValues map[string]any
	OldValues map[string]any
	LSN       string
}

// SnapshotBatch contains snapshot rows and resulting LSN.
type SnapshotBatch struct {
	Rows []map[string]any
	LSN  string
}

// Source provides access to PostgreSQL snapshots and WAL.
type Source interface {
	Snapshot(ctx context.Context, stream config.StreamConfig) (SnapshotBatch, error)
	Changes(ctx context.Context, stream config.StreamConfig, fromLSN string) ([]ChangeEvent, string, error)
}

// Target consumes replicated data.
type Target interface {
	ApplySnapshot(ctx context.Context, stream config.StreamConfig, rows []map[string]any) error
	ApplyChange(ctx context.Context, stream config.StreamConfig, event ChangeEvent) error
	Name() string
}

// Replicator coordinates snapshot and change replication.
type Replicator struct {
	source   Source
	targets  []Target
	policy   *policy.Engine
	cfg      config.Config
	manifest *manifest.Manifest
	lsnMu    sync.Mutex
	lsns     map[string]string
}

// New constructs a Replicator instance.
func New(cfg config.Config, src Source, targets []Target, engine *policy.Engine) (*Replicator, error) {
	if src == nil {
		return nil, fmt.Errorf("source is required")
	}
	if len(cfg.Streams) == 0 {
		return nil, fmt.Errorf("at least one stream must be configured")
	}
	if engine == nil {
		engine = policy.NewEngine(cfg.Policies)
	}
	hash, err := engine.PolicyHash()
	if err != nil {
		return nil, err
	}
	return &Replicator{
		source:   src,
		targets:  targets,
		policy:   engine,
		cfg:      cfg,
		manifest: manifest.New(hash),
		lsns:     map[string]string{},
	}, nil
}

// Manifest returns a clone of the manifest for reporting.
func (r *Replicator) Manifest() *manifest.Manifest {
	return r.manifest.Clone()
}

// RunSnapshot replicates snapshot data for all streams.
func (r *Replicator) RunSnapshot(ctx context.Context) error {
	for _, stream := range r.cfg.Streams {
		batch, err := r.source.Snapshot(ctx, stream)
		if err != nil {
			return fmt.Errorf("snapshot %s: %w", stream.Name, err)
		}
		filteredRows := make([]map[string]any, 0, len(batch.Rows))
		for _, row := range batch.Rows {
			filtered, ok, err := r.policy.Apply(policy.StreamMetadata{
				Name:   stream.Name,
				Tags:   stream.Tags,
				Policy: stream.Policy,
			}, row)
			if err != nil {
				return err
			}
			if !ok {
				continue
			}
			filteredRows = append(filteredRows, filtered)
			r.manifest.UpdateSnapshot(stream.Name, stream.Table, filtered)
		}
		if err := r.applySnapshot(ctx, stream, filteredRows); err != nil {
			return err
		}
		r.setLSN(stream.Name, batch.LSN)
	}
	return nil
}

func (r *Replicator) applySnapshot(ctx context.Context, stream config.StreamConfig, rows []map[string]any) error {
	for _, target := range r.targets {
		if err := target.ApplySnapshot(ctx, stream, rows); err != nil {
			return fmt.Errorf("target %s snapshot %s: %w", target.Name(), stream.Name, err)
		}
	}
	return nil
}

// RunChanges processes WAL changes for all streams from recorded LSN positions.
func (r *Replicator) RunChanges(ctx context.Context, override map[string]string) error {
	for _, stream := range r.cfg.Streams {
		startLSN := r.getLSN(stream.Name)
		if override != nil {
			if v, ok := override[stream.Name]; ok {
				startLSN = v
			}
		}
		events, lsn, err := r.source.Changes(ctx, stream, startLSN)
		if err != nil {
			return fmt.Errorf("changes %s: %w", stream.Name, err)
		}
		for _, evt := range events {
			processed, ok, err := r.filterEvent(stream, evt)
			if err != nil {
				return err
			}
			if !ok {
				continue
			}
			if err := r.dispatchChange(ctx, stream, processed); err != nil {
				return err
			}
		}
		if lsn != "" {
			r.setLSN(stream.Name, lsn)
		}
	}
	return nil
}

func (r *Replicator) filterEvent(stream config.StreamConfig, evt ChangeEvent) (ChangeEvent, bool, error) {
	processed := evt
	switch evt.Type {
	case ChangeTypeInsert, ChangeTypeUpdate:
		filtered, ok, err := r.policy.Apply(policy.StreamMetadata{
			Name:   stream.Name,
			Tags:   stream.Tags,
			Policy: stream.Policy,
		}, evt.NewValues)
		if err != nil {
			return ChangeEvent{}, false, err
		}
		if !ok {
			return ChangeEvent{}, false, nil
		}
		processed.NewValues = filtered
	case ChangeTypeDelete:
		filtered, ok, err := r.policy.Apply(policy.StreamMetadata{
			Name:   stream.Name,
			Tags:   stream.Tags,
			Policy: stream.Policy,
		}, evt.OldValues)
		if err != nil {
			return ChangeEvent{}, false, err
		}
		if !ok {
			return ChangeEvent{}, false, nil
		}
		processed.OldValues = filtered
	}
	return processed, true, nil
}

func (r *Replicator) dispatchChange(ctx context.Context, stream config.StreamConfig, evt ChangeEvent) error {
	for _, target := range r.targets {
		if err := target.ApplyChange(ctx, stream, evt); err != nil {
			return fmt.Errorf("target %s change %s: %w", target.Name(), stream.Name, err)
		}
	}
	switch evt.Type {
	case ChangeTypeInsert:
		r.manifest.UpdateChange(stream.Name, stream.Table, "insert", evt.NewValues)
	case ChangeTypeUpdate:
		r.manifest.UpdateChange(stream.Name, stream.Table, "update", evt.NewValues)
	case ChangeTypeDelete:
		r.manifest.UpdateChange(stream.Name, stream.Table, "delete", evt.OldValues)
	}
	return nil
}

// Positions returns the last known LSN per stream.
func (r *Replicator) Positions() map[string]string {
	r.lsnMu.Lock()
	defer r.lsnMu.Unlock()
	out := make(map[string]string, len(r.lsns))
	for k, v := range r.lsns {
		out[k] = v
	}
	return out
}

func (r *Replicator) setLSN(stream, lsn string) {
	if lsn == "" {
		return
	}
	r.lsnMu.Lock()
	defer r.lsnMu.Unlock()
	r.lsns[stream] = lsn
}

func (r *Replicator) getLSN(stream string) string {
	r.lsnMu.Lock()
	defer r.lsnMu.Unlock()
	return r.lsns[stream]
}
