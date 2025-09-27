package target

import (
	"context"

	"github.com/summit/pacdc/pkg/config"
	"github.com/summit/pacdc/pkg/replicator"
)

// BigQueryTarget simulates BigQuery table replication in memory.
type BigQueryTarget struct {
	dataset string
	table   string
	storage *tableStorage
}

// NewBigQueryTarget constructs a BigQuery target helper.
func NewBigQueryTarget(cfg config.BigQueryConfig) *BigQueryTarget {
	return &BigQueryTarget{
		dataset: cfg.Dataset,
		table:   cfg.Table,
		storage: newTableStorage(),
	}
}

// Name identifies the target.
func (b *BigQueryTarget) Name() string {
	return "bigquery"
}

// ApplySnapshot loads snapshot rows.
func (b *BigQueryTarget) ApplySnapshot(_ context.Context, stream config.StreamConfig, rows []map[string]any) error {
	b.storage.applySnapshot(stream, rows)
	return nil
}

// ApplyChange applies WAL-derived changes.
func (b *BigQueryTarget) ApplyChange(_ context.Context, stream config.StreamConfig, evt replicator.ChangeEvent) error {
	return b.storage.applyChange(stream, evt)
}

// Export returns current rows for a stream.
func (b *BigQueryTarget) Export(stream string) []map[string]any {
	return b.storage.export(stream)
}
