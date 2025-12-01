package runner

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/summit/agsm/internal/config"
	"github.com/summit/agsm/internal/metrics"
	"github.com/summit/agsm/internal/probes"
	"github.com/summit/agsm/internal/storage"
)

// Runner coordinates probe execution, metrics aggregation, and persistence.
type Runner struct {
	cfg     *config.Config
	storage *storage.FileStorage
	now     func() time.Time
}

// Option configures a runner instance.
type Option func(*Runner)

// WithNow overrides the time provider for testing.
func WithNow(now func() time.Time) Option {
	return func(r *Runner) {
		r.now = now
	}
}

// New creates a runner from configuration and storage.
func New(cfg *config.Config, store *storage.FileStorage, opts ...Option) *Runner {
	r := &Runner{
		cfg:     cfg,
		storage: store,
		now:     time.Now,
	}
	for _, opt := range opts {
		opt(r)
	}
	return r
}

// RunIteration executes all configured probes once and persists the results.
func (r *Runner) RunIteration(ctx context.Context) (metrics.IterationReport, error) {
	if r.cfg == nil {
		return metrics.IterationReport{}, fmt.Errorf("runner missing configuration")
	}
	now := r.now().UTC()
	results := make([]metrics.ProbeResult, 0, len(r.cfg.Probes))
	alerts := make([]metrics.Alert, 0)

	for _, probe := range r.cfg.Probes {
		canary := r.cfg.CanaryFor(probe.Name)
		result, err := probes.Run(ctx, probe, canary, now)
		if err != nil && result.Error == "" {
			result.Error = err.Error()
		}
		if !result.Success {
			alerts = append(alerts, metrics.Alert{
				Level:     "critical",
				Message:   fmt.Sprintf("probe %s failed: %s", probe.Name, result.Error),
				Metric:    probe.Scenario,
				Timestamp: now,
			})
		}
		results = append(results, result)
	}

	state, err := r.storage.Load()
	if err != nil {
		return metrics.IterationReport{}, err
	}

	cutoff := now.Add(-r.cfg.AlertWindow.Duration)
	filtered := make([]metrics.ProbeResult, 0, len(state.Probes)+len(results))
	for _, existing := range state.Probes {
		if existing.Timestamp.After(cutoff) || existing.Timestamp.Equal(cutoff) {
			filtered = append(filtered, existing)
		}
	}
	filtered = append(filtered, results...)

	summary := summarise(filtered)

	sloPayload, err := json.Marshal(r.cfg.SLO)
	if err != nil {
		return metrics.IterationReport{}, fmt.Errorf("serialise slo state: %w", err)
	}

	if summary.Failures > 0 {
		if summary.SuccessRate < r.cfg.SLO.SuccessRate {
			alerts = append(alerts, metrics.Alert{
				Level:     "critical",
				Message:   fmt.Sprintf("SLO breach: successRate %.2f < %.2f", summary.SuccessRate, r.cfg.SLO.SuccessRate),
				Metric:    "successRate",
				Threshold: r.cfg.SLO.SuccessRate,
				Observed:  summary.SuccessRate,
				Timestamp: now,
			})
		} else if r.cfg.SLO.AlertAfterFailures > 0 && summary.Failures >= r.cfg.SLO.AlertAfterFailures {
			alerts = append(alerts, metrics.Alert{
				Level:     "warning",
				Message:   fmt.Sprintf("%d probe failures in window", summary.Failures),
				Metric:    "failures",
				Threshold: float64(r.cfg.SLO.AlertAfterFailures),
				Observed:  float64(summary.Failures),
				Timestamp: now,
			})
		}
	}

	state.Probes = filtered
	state.Aggregates = summary
	state.Alerts = append(state.Alerts, alerts...)
	if len(state.Alerts) > 50 {
		state.Alerts = state.Alerts[len(state.Alerts)-50:]
	}
	state.WindowMinutes = r.cfg.AlertWindow.Duration.Minutes()
	state.SLO = sloPayload
	state.LastUpdated = now

	if err := r.storage.Save(state); err != nil {
		return metrics.IterationReport{}, err
	}

	return metrics.IterationReport{
		Timestamp: now,
		Results:   results,
		Alerts:    alerts,
		Summary:   summary,
	}, nil
}

func summarise(results []metrics.ProbeResult) metrics.Aggregates {
	summary := metrics.Aggregates{}
	summary.Total = len(results)
	if summary.Total == 0 {
		summary.SuccessRate = 1
		return summary
	}
	for _, result := range results {
		if result.Success {
			summary.Successes++
		} else {
			summary.Failures++
		}
	}
	summary.SuccessRate = float64(summary.Successes) / float64(summary.Total)
	return summary
}
