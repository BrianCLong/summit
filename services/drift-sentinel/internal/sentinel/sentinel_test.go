package sentinel_test

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"os"
	"reflect"
	"testing"
	"time"

	"github.com/summit/drift-sentinel/internal/canary"
	"github.com/summit/drift-sentinel/internal/dashboard"
	"github.com/summit/drift-sentinel/internal/featurestore"
	"github.com/summit/drift-sentinel/internal/model"
	"github.com/summit/drift-sentinel/internal/replay"
	"github.com/summit/drift-sentinel/internal/sentinel"

	"github.com/xitongsys/parquet-go-source/local"
	"github.com/xitongsys/parquet-go/writer"
)

func TestSentinelAlertsOnInjectedDrift(t *testing.T) {
	cfg := sentinel.DefaultConfig()
	cfg.WindowSize = 5
	cfg.HistorySize = 64
	cfg.Thresholds = sentinel.Thresholds{PSI: 0.02, KLDivergence: 0.01, ErrorDelta: 0.1}
	cfg.RandomSeed = 123

	mdl := &model.LinearModel{Weights: map[string]float64{"x": 1}}
	snap := featurestore.NewSnapshotter(32)
	gate := canary.NewGate(cfg.WindowSize)
	s := sentinel.New(cfg, mdl, snap, nil, gate)

	now := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	for i := 0; i < cfg.WindowSize; i++ {
		event := sentinel.Event{
			Timestamp:        now.Add(time.Duration(i) * time.Minute),
			Features:         map[string]float64{"x": float64(i)},
			ProductionOutput: float64(i),
			Actual:           float64(i),
		}
		if err := s.ProcessEvent(context.Background(), event); err != nil {
			t.Fatalf("process warmup event: %v", err)
		}
	}

	for i := 0; i < cfg.WindowSize; i++ {
		event := sentinel.Event{
			Timestamp:        now.Add(time.Duration(cfg.WindowSize+i) * time.Minute),
			Features:         map[string]float64{"x": float64(10 + i)},
			ProductionOutput: 0,
			Actual:           0,
		}
		if err := s.ProcessEvent(context.Background(), event); err != nil {
			t.Fatalf("process drift event: %v", err)
		}
	}

	alerts := s.Alerts()
	if len(alerts) == 0 {
		t.Fatalf("expected at least one alert when drift injected")
	}
	history := s.DriftHistory()
	if len(history) == 0 {
		t.Fatalf("expected drift history to be recorded")
	}
}

func TestDashboardMetricsEndpoint(t *testing.T) {
	cfg := sentinel.DefaultConfig()
	cfg.WindowSize = 3
	cfg.HistorySize = 16
	cfg.Thresholds = sentinel.Thresholds{PSI: 0.01, KLDivergence: 0.01, ErrorDelta: 0.01}
	cfg.RandomSeed = 77

	mdl := &model.LinearModel{Weights: map[string]float64{"x": 1}}
	snap := featurestore.NewSnapshotter(16)
	gate := canary.NewGate(cfg.WindowSize)
	s := sentinel.New(cfg, mdl, snap, nil, gate)

	base := time.Date(2024, 2, 1, 12, 0, 0, 0, time.UTC)
	for i := 0; i < 6; i++ {
		value := float64(i)
		event := sentinel.Event{
			Timestamp:        base.Add(time.Duration(i) * time.Minute),
			Features:         map[string]float64{"x": value},
			ProductionOutput: value,
			Actual:           value,
		}
		if i >= 3 {
			event.ProductionOutput = 0
		}
		if err := s.ProcessEvent(context.Background(), event); err != nil {
			t.Fatalf("process event: %v", err)
		}
	}

	dash := dashboard.NewServer(s)
	server := httptest.NewServer(dash.Handler())
	defer server.Close()

	resp, err := server.Client().Get(server.URL + "/metrics")
	if err != nil {
		t.Fatalf("fetch metrics: %v", err)
	}
	defer resp.Body.Close()
	var payload struct {
		Points []sentinel.DriftPoint `json:"points"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if len(payload.Points) == 0 {
		t.Fatalf("expected non-empty time series from dashboard")
	}
}

func TestReplayDeterminism(t *testing.T) {
	tmp, err := os.CreateTemp(t.TempDir(), "replay-*.parquet")
	if err != nil {
		t.Fatalf("temp file: %v", err)
	}
	tmp.Close()

	fw, err := local.NewLocalFileWriter(tmp.Name())
	if err != nil {
		t.Fatalf("file writer: %v", err)
	}
	pw, err := writer.NewParquetWriter(fw, new(replay.Record), 1)
	if err != nil {
		t.Fatalf("parquet writer: %v", err)
	}
	base := time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC)
	for i := 0; i < 12; i++ {
		features := map[string]float64{"x": float64(i)}
		encoded, _ := json.Marshal(features)
		rec := replay.Record{
			Timestamp: base.Add(time.Duration(i) * time.Minute).UnixMilli(),
			Production: func() float64 {
				if i < 6 {
					return float64(i)
				}
				return 0
			}(),
			Actual:   float64(i % 3),
			Features: string(encoded),
		}
		if err := pw.Write(rec); err != nil {
			t.Fatalf("write record: %v", err)
		}
	}
	if err := pw.WriteStop(); err != nil {
		t.Fatalf("stop writer: %v", err)
	}
	if err := fw.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	cfg := sentinel.DefaultConfig()
	cfg.WindowSize = 4
	cfg.HistorySize = 64
	cfg.Thresholds = sentinel.Thresholds{PSI: 0.01, KLDivergence: 0.01, ErrorDelta: 0.01}
	cfg.SampleRate = 1
	cfg.RandomSeed = 42

	newSentinel := func() *sentinel.Sentinel {
		mdl := &model.LinearModel{Weights: map[string]float64{"x": 1}}
		snap := featurestore.NewSnapshotter(32)
		gate := canary.NewGate(cfg.WindowSize)
		return sentinel.New(cfg, mdl, snap, nil, gate)
	}

	ctx := context.Background()
	first := newSentinel()
	if err := replay.Run(ctx, first, tmp.Name()); err != nil {
		t.Fatalf("first replay: %v", err)
	}
	second := newSentinel()
	if err := replay.Run(ctx, second, tmp.Name()); err != nil {
		t.Fatalf("second replay: %v", err)
	}

	alerts1 := first.Alerts()
	alerts2 := second.Alerts()
	if len(alerts1) == 0 || len(alerts2) == 0 {
		t.Fatalf("expected alerts from replay runs")
	}
	if !reflect.DeepEqual(alerts1, alerts2) {
		t.Fatalf("alerts differ between replays")
	}
}
