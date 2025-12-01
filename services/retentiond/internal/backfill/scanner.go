package backfill

import (
	"context"
	"time"

	"github.com/summit/services/retentiond/internal/config"
	"github.com/summit/services/retentiond/internal/engine"
)

// Scanner performs a dry-run sweep to surface outstanding deletions.
type Scanner struct {
	Engine *engine.Engine
}

// Scan executes every policy in dry-run mode returning their results.
func (s *Scanner) Scan(ctx context.Context, cfg config.Config, now time.Time) ([]engine.Result, error) {
	cfg.DryRun = true
	original := s.Engine.DryRun
	s.Engine.DryRun = true
	defer func() { s.Engine.DryRun = original }()
	return s.Engine.Run(ctx, cfg, now)
}
