package sentinel

import (
	"context"
	"math/rand"
	"sync"
	"time"

	"github.com/summit/drift-sentinel/internal/canary"
	"github.com/summit/drift-sentinel/internal/featurestore"
	"github.com/summit/drift-sentinel/internal/metrics"
	"github.com/summit/drift-sentinel/internal/model"
	"github.com/summit/drift-sentinel/internal/webhook"
)

// Event represents a single production inference and its associated metadata.
type Event struct {
	Timestamp        time.Time
	Features         map[string]float64
	ProductionOutput float64
	Actual           float64
}

// Thresholds define the alert boundaries for each drift metric.
type Thresholds struct {
	PSI          float64
	KLDivergence float64
	ErrorDelta   float64
}

// Config controls the runtime behaviour of the sentinel.
type Config struct {
	WindowSize  int
	SampleRate  float64
	Bins        int
	HistorySize int
	Thresholds  Thresholds
	RandomSeed  int64
}

// DriftPoint captures a single evaluation of drift metrics.
type DriftPoint struct {
	Timestamp  time.Time `json:"timestamp"`
	PSI        float64   `json:"psi"`
	KL         float64   `json:"kl"`
	ErrorDelta float64   `json:"error_delta"`
}

// Alert aggregates the drift metrics that triggered a notification.
type Alert struct {
	Timestamp time.Time             `json:"timestamp"`
	Metrics   DriftPoint            `json:"metrics"`
	Snapshot  featurestore.Snapshot `json:"snapshot"`
}

// Sentinel orchestrates the shadow model, drift metrics, and alerting pipeline.
type Sentinel struct {
	mu          sync.RWMutex
	cfg         Config
	gate        *canary.Gate
	rand        *rand.Rand
	model       model.Model
	snapshotter *featurestore.Snapshotter
	dispatcher  *webhook.Dispatcher

	production []float64
	shadow     []float64
	actual     []float64

	history []DriftPoint
	alerts  []Alert
}

// DefaultConfig returns sane defaults for the sentinel.
func DefaultConfig() Config {
	return Config{
		WindowSize:  50,
		SampleRate:  1.0,
		Bins:        10,
		HistorySize: 512,
		Thresholds: Thresholds{
			PSI:          0.1,
			KLDivergence: 0.5,
			ErrorDelta:   0.05,
		},
		RandomSeed: time.Now().UnixNano(),
	}
}

// New creates a sentinel using the provided dependencies.
func New(cfg Config, mdl model.Model, snapshotter *featurestore.Snapshotter, dispatcher *webhook.Dispatcher, gate *canary.Gate) *Sentinel {
	if cfg.WindowSize <= 0 {
		cfg.WindowSize = 50
	}
	if cfg.HistorySize <= 0 {
		cfg.HistorySize = 512
	}
	if cfg.SampleRate <= 0 || cfg.SampleRate > 1 {
		cfg.SampleRate = 1.0
	}
	if cfg.Bins <= 0 {
		cfg.Bins = 10
	}
	if cfg.RandomSeed == 0 {
		cfg.RandomSeed = time.Now().UnixNano()
	}
	if gate == nil {
		gate = canary.NewGate(cfg.WindowSize)
	}
	if snapshotter == nil {
		snapshotter = featurestore.NewSnapshotter(cfg.HistorySize)
	}
	randSrc := rand.New(rand.NewSource(cfg.RandomSeed))
	return &Sentinel{
		cfg:         cfg,
		gate:        gate,
		rand:        randSrc,
		model:       mdl,
		snapshotter: snapshotter,
		dispatcher:  dispatcher,
	}
}

// ProcessEvent evaluates the provided production event against the shadow model.
func (s *Sentinel) ProcessEvent(ctx context.Context, event Event) error {
	s.gate.Track()
	s.snapshotter.Record(event.Timestamp, event.Features)

	if s.rand.Float64() > s.cfg.SampleRate {
		return nil
	}

	prediction, err := s.model.Predict(event.Features)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.production = append(s.production, event.ProductionOutput)
	s.shadow = append(s.shadow, prediction)
	s.actual = append(s.actual, event.Actual)

	if len(s.production) > s.cfg.WindowSize {
		s.production = s.production[len(s.production)-s.cfg.WindowSize:]
	}
	if len(s.shadow) > s.cfg.WindowSize {
		s.shadow = s.shadow[len(s.shadow)-s.cfg.WindowSize:]
	}
	if len(s.actual) > s.cfg.WindowSize {
		s.actual = s.actual[len(s.actual)-s.cfg.WindowSize:]
	}

	if len(s.production) < s.cfg.WindowSize || len(s.shadow) < s.cfg.WindowSize {
		return nil
	}
	if !s.gate.Ready() {
		return nil
	}

	psi := metrics.PopulationStabilityIndex(s.production, s.shadow, s.cfg.Bins)
	kl := metrics.KLDivergence(s.production, s.shadow, s.cfg.Bins)
	delta := metrics.ErrorDelta(s.production, s.shadow, s.actual)
	point := DriftPoint{Timestamp: event.Timestamp, PSI: psi, KL: kl, ErrorDelta: delta}

	s.history = append(s.history, point)
	if len(s.history) > s.cfg.HistorySize {
		s.history = s.history[len(s.history)-s.cfg.HistorySize:]
	}

	if s.exceedsThreshold(point) {
		snapshot := s.snapshotter.All()
		var latest featurestore.Snapshot
		if len(snapshot) > 0 {
			latest = snapshot[len(snapshot)-1]
		}
		alert := Alert{Timestamp: event.Timestamp, Metrics: point, Snapshot: latest}
		s.alerts = append(s.alerts, alert)
		go s.dispatchAlert(ctx, alert)
	}
	return nil
}

func (s *Sentinel) exceedsThreshold(point DriftPoint) bool {
	th := s.cfg.Thresholds
	if th.PSI > 0 && point.PSI >= th.PSI {
		return true
	}
	if th.KLDivergence > 0 && point.KL >= th.KLDivergence {
		return true
	}
	if th.ErrorDelta > 0 && point.ErrorDelta >= th.ErrorDelta {
		return true
	}
	return false
}

func (s *Sentinel) dispatchAlert(ctx context.Context, alert Alert) {
	if s.dispatcher == nil {
		return
	}
	_ = s.dispatcher.Dispatch(ctx, alert)
}

// DriftHistory returns a copy of the computed drift metrics.
func (s *Sentinel) DriftHistory() []DriftPoint {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]DriftPoint, len(s.history))
	copy(out, s.history)
	return out
}

// Alerts exposes the alerts emitted so far. This is primarily intended for tests.
func (s *Sentinel) Alerts() []Alert {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Alert, len(s.alerts))
	copy(out, s.alerts)
	return out
}
