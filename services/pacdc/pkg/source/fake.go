package source

import (
	"context"
	"sync"

	"github.com/summit/pacdc/pkg/config"
	"github.com/summit/pacdc/pkg/replicator"
)

// FakeSource is an in-memory implementation for testing.
type FakeSource struct {
	mu        sync.Mutex
	snapshots map[string]replicator.SnapshotBatch
	changes   map[string][]replicator.ChangeEvent
}

// NewFakeSource creates a fake source with snapshots and change events.
func NewFakeSource() *FakeSource {
	return &FakeSource{
		snapshots: make(map[string]replicator.SnapshotBatch),
		changes:   make(map[string][]replicator.ChangeEvent),
	}
}

// SetSnapshot sets snapshot rows for a stream.
func (f *FakeSource) SetSnapshot(stream string, rows []map[string]any, lsn string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.snapshots[stream] = replicator.SnapshotBatch{Rows: rows, LSN: lsn}
}

// AppendChange appends a change event for a stream.
func (f *FakeSource) AppendChange(stream string, evt replicator.ChangeEvent) {
	f.mu.Lock()
	defer f.mu.Unlock()
	evt.Stream = stream
	f.changes[stream] = append(f.changes[stream], evt)
}

// Snapshot implements replicator.Source.
func (f *FakeSource) Snapshot(_ context.Context, stream config.StreamConfig) (replicator.SnapshotBatch, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	batch := f.snapshots[stream.Name]
	cloned := replicator.SnapshotBatch{LSN: batch.LSN, Rows: make([]map[string]any, len(batch.Rows))}
	for i, row := range batch.Rows {
		cloned.Rows[i] = cloneRow(row)
	}
	return cloned, nil
}

// Changes implements replicator.Source.
func (f *FakeSource) Changes(_ context.Context, stream config.StreamConfig, fromLSN string) ([]replicator.ChangeEvent, string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	events := f.changes[stream.Name]
	cloned := make([]replicator.ChangeEvent, 0, len(events))
	lastLSN := fromLSN
	for _, evt := range events {
		if evt.LSN != "" {
			lastLSN = evt.LSN
		}
		cloned = append(cloned, cloneEvent(evt))
	}
	return cloned, lastLSN, nil
}

func cloneRow(row map[string]any) map[string]any {
	out := make(map[string]any, len(row))
	for k, v := range row {
		out[k] = v
	}
	return out
}

func cloneEvent(evt replicator.ChangeEvent) replicator.ChangeEvent {
	cloned := evt
	cloned.NewValues = cloneMap(evt.NewValues)
	cloned.OldValues = cloneMap(evt.OldValues)
	return cloned
}

func cloneMap(row map[string]any) map[string]any {
	if row == nil {
		return nil
	}
	out := make(map[string]any, len(row))
	for k, v := range row {
		out[k] = v
	}
	return out
}
