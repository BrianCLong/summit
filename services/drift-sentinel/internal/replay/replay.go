package replay

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/summit/drift-sentinel/internal/sentinel"

	"github.com/xitongsys/parquet-go-source/local"
	"github.com/xitongsys/parquet-go/reader"
)

// Record models the parquet schema expected by the replay engine.
type Record struct {
	Timestamp  int64   `parquet:"name=timestamp, type=INT64"`
	Production float64 `parquet:"name=production, type=DOUBLE"`
	Actual     float64 `parquet:"name=actual, type=DOUBLE"`
	Features   string  `parquet:"name=features, type=BYTE_ARRAY, convertedtype=UTF8"`
}

// Run replays stored inference events through the sentinel. The function is deterministic
// as long as the sentinel is configured with a fixed random seed.
func Run(ctx context.Context, s *sentinel.Sentinel, path string) error {
	fr, err := local.NewLocalFileReader(path)
	if err != nil {
		return fmt.Errorf("open parquet file: %w", err)
	}
	defer fr.Close()

	pr, err := reader.NewParquetReader(fr, new(Record), 1)
	if err != nil {
		return fmt.Errorf("create parquet reader: %w", err)
	}
	defer pr.ReadStop()

	rows := int(pr.GetNumRows())
	batch := make([]Record, rows)
	if err := pr.Read(&batch); err != nil {
		return fmt.Errorf("read parquet rows: %w", err)
	}

	for _, rec := range batch {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		features := make(map[string]float64)
		if rec.Features != "" {
			if err := json.Unmarshal([]byte(rec.Features), &features); err != nil {
				return fmt.Errorf("decode features: %w", err)
			}
		}
		event := sentinel.Event{
			Timestamp:        time.Unix(0, rec.Timestamp*int64(time.Millisecond)),
			Features:         features,
			ProductionOutput: rec.Production,
			Actual:           rec.Actual,
		}
		if err := s.ProcessEvent(ctx, event); err != nil {
			return err
		}
	}
	return nil
}
