package core

import (
	"errors"
	"sort"
	"sync"
	"time"
)

// SliceResolver exposes the subset matching logic offered by the slice registry.
type SliceResolver interface {
	Resolve(attributes map[string]string) ([]string, error)
}

// Aggregator maintains an in-memory rolling window of events and computes fairness metrics.
type Aggregator struct {
	mu           sync.RWMutex
	window       time.Duration
	k            int
	thresholds   Thresholds
	resolver     SliceResolver
	events       []Event
	alerts       []Alert
	lastSnapshot *MetricSnapshot
}

// NewAggregator constructs a new streaming fairness aggregator.
func NewAggregator(window time.Duration, k int, thresholds Thresholds, resolver SliceResolver) *Aggregator {
	return &Aggregator{
		window:     window,
		k:          k,
		thresholds: thresholds,
		resolver:   resolver,
		events:     make([]Event, 0, 1024),
		alerts:     make([]Alert, 0),
	}
}

// Ingest registers a new event and returns the latest metrics.
func (a *Aggregator) Ingest(evt Event) (MetricSnapshot, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if evt.Timestamp.IsZero() {
		evt.Timestamp = time.Now().UTC()
	}
	if evt.Attributes == nil {
		evt.Attributes = map[string]string{}
	}
	a.events = append(a.events, evt)
	a.pruneLocked(evt.Timestamp)
	snapshot := a.computeLocked()
	a.lastSnapshot = &snapshot
	a.evaluateAlertsLocked(snapshot)
	return snapshot, nil
}

// Metrics returns the most recent snapshot, computing one if necessary.
func (a *Aggregator) Metrics() MetricSnapshot {
	a.mu.Lock()
	defer a.mu.Unlock()

	now := time.Now().UTC()
	a.pruneLocked(now)
	if a.lastSnapshot == nil {
		snapshot := a.computeLocked()
		a.lastSnapshot = &snapshot
	}
	return *a.lastSnapshot
}

// Alerts returns a copy of the outstanding alerts.
func (a *Aggregator) Alerts() []Alert {
	a.mu.RLock()
	defer a.mu.RUnlock()

	cp := make([]Alert, len(a.alerts))
	copy(cp, a.alerts)
	return cp
}

// Reset removes all streaming state (used by deterministic replays).
func (a *Aggregator) Reset() {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.events = a.events[:0]
	a.alerts = a.alerts[:0]
	a.lastSnapshot = nil
}

func (a *Aggregator) pruneLocked(now time.Time) {
	cutoff := now.Add(-a.window)
	kept := a.events[:0]
	for _, evt := range a.events {
		if evt.Timestamp.Before(cutoff) {
			continue
		}
		kept = append(kept, evt)
	}
	a.events = kept
}

func (a *Aggregator) computeLocked() MetricSnapshot {
	now := time.Now().UTC()
	if len(a.events) == 0 {
		return MetricSnapshot{
			WindowStart:  now.Add(-a.window),
			WindowEnd:    now,
			GroupMetrics: []GroupMetrics{},
		}
	}

	// Build per-group collections.
	type perGroup struct {
		events []Event
	}
	perGroupMap := make(map[string]*perGroup)
	for _, evt := range a.events {
		grp := evt.Group
		if grp == "" {
			grp = "__unspecified__"
		}
		bucket := perGroupMap[grp]
		if bucket == nil {
			bucket = &perGroup{events: make([]Event, 0, 32)}
			perGroupMap[grp] = bucket
		}
		bucket.events = append(bucket.events, evt)
	}

	groups := make([]GroupMetrics, 0, len(perGroupMap))
	minTS := a.events[0].Timestamp
	maxTS := a.events[len(a.events)-1].Timestamp
	for grp, bucket := range perGroupMap {
		support := len(bucket.events)
		tp, fp, tn, fn := 0, 0, 0, 0
		predictedPos := 0
		for _, evt := range bucket.events {
			if evt.PredictedLabel {
				predictedPos++
			}
			switch {
			case evt.PredictedLabel && evt.ActualLabel:
				tp++
			case evt.PredictedLabel && !evt.ActualLabel:
				fp++
			case !evt.PredictedLabel && !evt.ActualLabel:
				tn++
			case !evt.PredictedLabel && evt.ActualLabel:
				fn++
			}
			if evt.Timestamp.Before(minTS) {
				minTS = evt.Timestamp
			}
			if evt.Timestamp.After(maxTS) {
				maxTS = evt.Timestamp
			}
		}

		tpr := rate(tp, tp+fn)
		fpr := rate(fp, fp+tn)
		posRate := rate(predictedPos, support)
		topKRate := eqOppAtK(bucket.events, a.k)

		groups = append(groups, GroupMetrics{
			Group:        grp,
			Support:      support,
			TP:           tp,
			FP:           fp,
			TN:           tn,
			FN:           fn,
			TPR:          tpr,
			FPR:          fpr,
			PositiveRate: posRate,
			TopKRate:     topKRate,
		})
	}

	sort.Slice(groups, func(i, j int) bool {
		return groups[i].Group < groups[j].Group
	})

	tprGap := gap(groups, func(g GroupMetrics) float64 { return g.TPR })
	fprGap := gap(groups, func(g GroupMetrics) float64 { return g.FPR })
	demoDiff := gap(groups, func(g GroupMetrics) float64 { return g.PositiveRate })
	eqOppDiff := gap(groups, func(g GroupMetrics) float64 { return g.TopKRate })

	return MetricSnapshot{
		WindowStart:     minTS,
		WindowEnd:       maxTS,
		GroupMetrics:    groups,
		TPRGap:          tprGap,
		FPRGap:          fprGap,
		DemographicDiff: demoDiff,
		EqOppAtKDiff:    eqOppDiff,
	}
}

func (a *Aggregator) evaluateAlertsLocked(snapshot MetricSnapshot) {
	newAlerts := make([]Alert, 0, 4)
	for _, pair := range []struct {
		metric    string
		value     float64
		threshold float64
	}{
		{"tpr_gap", snapshot.TPRGap, a.thresholds.TPRGap},
		{"fpr_gap", snapshot.FPRGap, a.thresholds.FPRGap},
		{"demographic_parity_diff", snapshot.DemographicDiff, a.thresholds.Demographic},
		{"eq_opp_at_k_diff", snapshot.EqOppAtKDiff, a.thresholds.EqOppAtKDiff},
	} {
		if pair.threshold <= 0 {
			continue
		}
		if pair.value > pair.threshold {
			groups := make([]string, len(snapshot.GroupMetrics))
			for i, g := range snapshot.GroupMetrics {
				groups[i] = g.Group
			}
			slices := a.resolveSlices(groups)
			newAlerts = append(newAlerts, Alert{
				Metric:    pair.metric,
				Value:     pair.value,
				Threshold: pair.threshold,
				WindowEnd: snapshot.WindowEnd,
				Groups:    groups,
				Slices:    slices,
				Explanation: map[string]string{
					"window": snapshot.WindowStart.Format(time.RFC3339) + "→" + snapshot.WindowEnd.Format(time.RFC3339),
				},
			})
		}
	}
	if len(newAlerts) > 0 {
		a.alerts = append(a.alerts, newAlerts...)
	}
}

func (a *Aggregator) resolveSlices(groups []string) []string {
	if a.resolver == nil {
		return nil
	}
	uniq := make(map[string]struct{})
	for _, evt := range a.events {
		if contains(groups, evt.Group) {
			slices, err := a.resolver.Resolve(evt.Attributes)
			if err != nil {
				continue
			}
			for _, s := range slices {
				uniq[s] = struct{}{}
			}
		}
	}
	if len(uniq) == 0 {
		return nil
	}
	result := make([]string, 0, len(uniq))
	for s := range uniq {
		result = append(result, s)
	}
	sort.Strings(result)
	return result
}

func contains(arr []string, v string) bool {
	for _, item := range arr {
		if item == v {
			return true
		}
	}
	return false
}

func rate(num, denom int) float64 {
	if denom == 0 {
		return 0
	}
	return float64(num) / float64(denom)
}

func gap(groups []GroupMetrics, selector func(GroupMetrics) float64) float64 {
	if len(groups) < 2 {
		return 0
	}
	minVal := selector(groups[0])
	maxVal := selector(groups[0])
	for _, g := range groups[1:] {
		v := selector(g)
		if v < minVal {
			minVal = v
		}
		if v > maxVal {
			maxVal = v
		}
	}
	return maxVal - minVal
}

func eqOppAtK(events []Event, k int) float64 {
	if k <= 0 || len(events) == 0 {
		return 0
	}
	cp := make([]Event, len(events))
	copy(cp, events)
	sort.Slice(cp, func(i, j int) bool {
		if cp[i].Score == cp[j].Score {
			return cp[i].PredictionID < cp[j].PredictionID
		}
		return cp[i].Score > cp[j].Score
	})
	limit := k
	if limit > len(cp) {
		limit = len(cp)
	}
	positives := 0
	for i := 0; i < limit; i++ {
		if cp[i].ActualLabel {
			positives++
		}
	}
	return float64(positives) / float64(limit)
}

// SnapshotForReplay exposes deterministic metrics for offline replay use cases.
func (a *Aggregator) SnapshotForReplay(events []Event) (MetricSnapshot, error) {
	if len(events) == 0 {
		return MetricSnapshot{}, errors.New("no events provided")
	}
	a.mu.Lock()
	defer a.mu.Unlock()

	a.events = append(a.events[:0], events...)
	snapshot := a.computeLocked()
	a.lastSnapshot = &snapshot
	a.alerts = a.alerts[:0]
	a.evaluateAlertsLocked(snapshot)
	return snapshot, nil
}
