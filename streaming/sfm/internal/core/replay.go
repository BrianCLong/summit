package core

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/fraugster/parquet-go/floor"
)

type replayRow struct {
	PredictionID   string  `parquet:"name=prediction_id, type=BYTE_ARRAY, convertedtype=UTF8"`
	Timestamp      string  `parquet:"name=timestamp, type=BYTE_ARRAY, convertedtype=UTF8"`
	Score          float64 `parquet:"name=score, type=DOUBLE"`
	PredictedLabel bool    `parquet:"name=predicted_label, type=BOOLEAN"`
	ActualLabel    bool    `parquet:"name=actual_label, type=BOOLEAN"`
	Group          string  `parquet:"name=group, type=BYTE_ARRAY, convertedtype=UTF8"`
	Attributes     string  `parquet:"name=attributes, type=BYTE_ARRAY, convertedtype=UTF8"`
}

// ReplayFromParquet consumes a parquet file and replays the contained events deterministically.
func ReplayFromParquet(path string, agg *Aggregator) (ReplayResult, error) {
	reader, err := floor.NewFileReader(path)
	if err != nil {
		return ReplayResult{}, fmt.Errorf("open parquet: %w", err)
	}
	defer reader.Close()

	events := make([]Event, 0, 1024)
	for reader.Next() {
		var row replayRow
		if err := reader.Scan(&row); err != nil {
			return ReplayResult{}, fmt.Errorf("scan parquet row: %w", err)
		}
		ts, err := parseReplayTimestamp(row.Timestamp)
		if err != nil {
			return ReplayResult{}, err
		}
		attributes := map[string]string{}
		trimmed := strings.TrimSpace(row.Attributes)
		if trimmed != "" {
			if err := json.Unmarshal([]byte(trimmed), &attributes); err != nil {
				return ReplayResult{}, fmt.Errorf("parse attributes: %w", err)
			}
		}
		events = append(events, Event{
			PredictionID:   strings.TrimSpace(row.PredictionID),
			Timestamp:      ts,
			Score:          row.Score,
			PredictedLabel: row.PredictedLabel,
			ActualLabel:    row.ActualLabel,
			Group:          strings.TrimSpace(row.Group),
			Attributes:     attributes,
		})
	}
	if err := reader.Err(); err != nil {
		return ReplayResult{}, fmt.Errorf("read parquet: %w", err)
	}
	if len(events) == 0 {
		return ReplayResult{}, fmt.Errorf("open parquet: no rows")
	}

	sort.Slice(events, func(i, j int) bool {
		if events[i].Timestamp.Equal(events[j].Timestamp) {
			return events[i].PredictionID < events[j].PredictionID
		}
		return events[i].Timestamp.Before(events[j].Timestamp)
	})

	agg.Reset()
	metrics := make([]MetricSnapshot, 0, len(events))
	for _, evt := range events {
		snapshot, err := agg.Ingest(evt)
		if err != nil {
			return ReplayResult{}, err
		}
		metrics = append(metrics, snapshot)
	}
	alerts := agg.Alerts()
	alertsCopy := make([]Alert, len(alerts))
	copy(alertsCopy, alerts)
	return ReplayResult{Metrics: metrics, Alerts: alertsCopy}, nil
}

func parseReplayTimestamp(raw string) (time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return time.Time{}, fmt.Errorf("missing timestamp")
	}
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05",
	}
	for _, layout := range layouts {
		if ts, err := time.Parse(layout, trimmed); err == nil {
			return ts.UTC(), nil
		}
	}
	return time.Time{}, fmt.Errorf("parse timestamp %q: unsupported format", raw)
}
