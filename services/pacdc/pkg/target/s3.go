package target

import (
	"context"

	"github.com/summit/pacdc/pkg/config"
	"github.com/summit/pacdc/pkg/replicator"
)

// S3Target simulates writing data to S3 by maintaining in-memory state.
type S3Target struct {
	bucket  string
	prefix  string
	storage *tableStorage
}

// NewS3Target constructs a new S3 target helper.
func NewS3Target(cfg config.S3Config) *S3Target {
	return &S3Target{
		bucket:  cfg.Bucket,
		prefix:  cfg.Prefix,
		storage: newTableStorage(),
	}
}

// Name identifies the target.
func (s *S3Target) Name() string {
	return "s3"
}

// ApplySnapshot loads snapshot rows into the bucket (simulated).
func (s *S3Target) ApplySnapshot(_ context.Context, stream config.StreamConfig, rows []map[string]any) error {
	s.storage.applySnapshot(stream, rows)
	return nil
}

// ApplyChange updates rows based on change events.
func (s *S3Target) ApplyChange(_ context.Context, stream config.StreamConfig, evt replicator.ChangeEvent) error {
	return s.storage.applyChange(stream, evt)
}

// Export returns the current contents for a stream.
func (s *S3Target) Export(stream string) []map[string]any {
	return s.storage.export(stream)
}
