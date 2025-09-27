package core

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"summit/services/cdqd/internal/models"
)

const (
	ruleTypeDenial    = "denial_constraint"
	ruleTypeEntity    = "entity_integrity"
	anomalyTypeMetric = "metric"
	anomalyTypeRule   = "rule"
)

// Store contains the in-memory state for metrics, rules, and alerts.
type Store struct {
	mu           sync.Mutex
	metrics      map[string]*metricState
	rules        map[string]models.Rule
	datasets     map[string]*datasetState
	suppressions []models.Suppression
	anomalies    []models.Anomaly
	events       []event
	sequence     int64
	idCounter    int64
}

type metricState struct {
	Config models.MetricConfig
	Series map[string]*seriesState
}

type seriesState struct {
	Holt   *HoltWintersState
	Robust *RobustZState
}

type datasetState struct {
	RuleIDs  []string
	trackers map[string]map[string]struct{}
}

type event struct {
	Type   string
	Metric *metricEvent
	Record *recordEvent
}

type metricEvent struct {
	Point  models.DataPoint
	Config models.MetricConfig
}

type recordEvent struct {
	Dataset   string
	Timestamp time.Time
	Values    map[string]any
}

// NewStore creates an initialized store.
func NewStore() *Store {
	return &Store{
		metrics:  make(map[string]*metricState),
		rules:    make(map[string]models.Rule),
		datasets: make(map[string]*datasetState),
	}
}

func (s *Store) nextID() string {
	s.idCounter++
	return fmt.Sprintf("anomaly-%d", s.idCounter)
}

func (s *Store) nextSequence() int64 {
	s.sequence++
	return s.sequence
}

func (s *Store) defaultMetricConfig() models.MetricConfig {
	return models.MetricConfig{
		SeasonLength:     24,
		Alpha:            0.2,
		Beta:             0.1,
		Gamma:            0.1,
		Sensitivity:      4,
		ResidualWindow:   240,
		RobustZWindow:    168,
		RobustZThreshold: 4,
	}
}

func mergeMetricConfig(base, override models.MetricConfig) models.MetricConfig {
	out := base
	if override.SeasonLength > 0 {
		out.SeasonLength = override.SeasonLength
	}
	if override.Alpha > 0 {
		out.Alpha = override.Alpha
	}
	if override.Beta > 0 {
		out.Beta = override.Beta
	}
	if override.Gamma > 0 {
		out.Gamma = override.Gamma
	}
	if override.Sensitivity > 0 {
		out.Sensitivity = override.Sensitivity
	}
	if override.ResidualWindow > 0 {
		out.ResidualWindow = override.ResidualWindow
	}
	if override.RobustZWindow > 0 {
		out.RobustZWindow = override.RobustZWindow
	}
	if override.RobustZThreshold > 0 {
		out.RobustZThreshold = override.RobustZThreshold
	}
	return out
}

func (s *Store) getOrCreateMetricState(metric string, override *models.MetricConfig) *metricState {
	state, ok := s.metrics[metric]
	if !ok {
		cfg := s.defaultMetricConfig()
		if override != nil {
			cfg = mergeMetricConfig(cfg, *override)
		}
		state = &metricState{
			Config: cfg,
			Series: make(map[string]*seriesState),
		}
		s.metrics[metric] = state
	} else if override != nil {
		state.Config = mergeMetricConfig(state.Config, *override)
	}
	return state
}

// IngestMetric processes metric datapoints and returns any emitted anomalies.
func (s *Store) IngestMetric(points []models.DataPoint, override *models.MetricConfig) ([]models.Anomaly, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.processMetric(points, override, true)
}

// AddRule registers a new rule in the store.
func (s *Store) AddRule(rule models.Rule) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if rule.ID == "" {
		rule.ID = fmt.Sprintf("rule-%d", len(s.rules)+1)
	}
	if rule.Dataset == "" {
		return errors.New("rule dataset is required")
	}
	if rule.Type != ruleTypeDenial && rule.Type != ruleTypeEntity {
		return fmt.Errorf("unsupported rule type %s", rule.Type)
	}
	if rule.Enabled && rule.Type == ruleTypeDenial && rule.Condition == nil {
		return errors.New("denial constraint requires a condition")
	}
	rule.Enabled = true
	s.rules[rule.ID] = rule
	ds := s.datasets[rule.Dataset]
	if ds == nil {
		ds = &datasetState{RuleIDs: []string{}, trackers: make(map[string]map[string]struct{})}
		s.datasets[rule.Dataset] = ds
	}
	ds.RuleIDs = appendIfMissing(ds.RuleIDs, rule.ID)
	return nil
}

func appendIfMissing(list []string, id string) []string {
	for _, existing := range list {
		if existing == id {
			return list
		}
	}
	return append(list, id)
}

// EvaluateRecord ingests a dataset row and returns violations.
func (s *Store) EvaluateRecord(record models.Record) ([]models.Anomaly, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if record.Dataset == "" {
		return nil, errors.New("dataset is required")
	}
	if record.Values == nil {
		return nil, errors.New("record values are required")
	}
	if record.Timestamp.IsZero() {
		record.Timestamp = time.Now().UTC()
	}
	return s.processRecord(record, true)
}

// AddSuppression registers a suppression window.
func (s *Store) AddSuppression(sup models.Suppression) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if sup.Target == "" {
		return errors.New("suppression target is required")
	}
	if sup.Start.IsZero() || sup.End.IsZero() {
		return errors.New("suppression window must have start and end")
	}
	if sup.End.Before(sup.Start) {
		return errors.New("suppression end must be after start")
	}
	if sup.ID == "" {
		sup.ID = fmt.Sprintf("suppression-%d", len(s.suppressions)+1)
	}
	s.suppressions = append(s.suppressions, sup)
	return nil
}

func (s *Store) isSuppressed(target, entity string, at time.Time) bool {
	for _, sup := range s.suppressions {
		if sup.Target != target {
			continue
		}
		if sup.Entity != "" && sup.Entity != entity {
			continue
		}
		if !at.Before(sup.Start) && !at.After(sup.End) {
			return true
		}
	}
	return false
}

// ListAnomalies returns the stored anomalies sorted by sequence.
func (s *Store) ListAnomalies() []models.Anomaly {
	s.mu.Lock()
	defer s.mu.Unlock()

	result := make([]models.Anomaly, len(s.anomalies))
	copy(result, s.anomalies)
	sort.Slice(result, func(i, j int) bool {
		return result[i].Sequence < result[j].Sequence
	})
	return result
}

// Replay reprocesses the event log and verifies deterministic output.
func (s *Store) Replay() (models.ReplayResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	replay := NewStore()
	// copy rules and suppressions
	for id, rule := range s.rules {
		ruleCopy := rule
		replay.rules[id] = ruleCopy
		ds := replay.datasets[rule.Dataset]
		if ds == nil {
			ds = &datasetState{RuleIDs: []string{}, trackers: make(map[string]map[string]struct{})}
			replay.datasets[rule.Dataset] = ds
		}
		ds.RuleIDs = append(ds.RuleIDs, id)
	}
	replay.suppressions = append(replay.suppressions, s.suppressions...)

	for _, ev := range s.events {
		switch ev.Type {
		case "metric":
			if ev.Metric == nil {
				continue
			}
			// ensure dataset state config
			points := []models.DataPoint{ev.Metric.Point}
			_, err := replay.processMetric(points, &ev.Metric.Config, false)
			if err != nil {
				return models.ReplayResult{}, err
			}
		case "record":
			if ev.Record == nil {
				continue
			}
			values := make(map[string]any, len(ev.Record.Values))
			for k, v := range ev.Record.Values {
				values[k] = v
			}
			rec := models.Record{Dataset: ev.Record.Dataset, Timestamp: ev.Record.Timestamp, Values: values}
			_, err := replay.processRecord(rec, false)
			if err != nil {
				return models.ReplayResult{}, err
			}
		}
	}

	matched := compareAnomalySequences(s.anomalies, replay.anomalies)
	return models.ReplayResult{Matched: matched, Anomalies: replay.anomalies}, nil
}

func compareAnomalySequences(a, b []models.Anomaly) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i].Target != b[i].Target {
			return false
		}
		if !a[i].Timestamp.Equal(b[i].Timestamp) {
			return false
		}
		if a[i].Type != b[i].Type {
			return false
		}
		if a[i].RuleID != b[i].RuleID {
			return false
		}
		if a[i].Entity != b[i].Entity {
			return false
		}
		if len(a[i].Explanations) != len(b[i].Explanations) {
			return false
		}
		for j := range a[i].Explanations {
			if a[i].Explanations[j].Algorithm != b[i].Explanations[j].Algorithm {
				return false
			}
		}
	}
	return true
}

func (s *Store) processMetric(points []models.DataPoint, override *models.MetricConfig, logEvent bool) ([]models.Anomaly, error) {
	anomalies := make([]models.Anomaly, 0)
	for _, point := range points {
		if point.Metric == "" {
			return nil, errors.New("metric name is required")
		}
		if point.Timestamp.IsZero() {
			point.Timestamp = time.Now().UTC()
		}
		state := s.getOrCreateMetricState(point.Metric, override)
		series := state.Series[point.Entity]
		if series == nil {
			series = &seriesState{
				Holt:   NewHoltWintersState(state.Config.Alpha, state.Config.Beta, state.Config.Gamma, state.Config.SeasonLength, state.Config.ResidualWindow),
				Robust: NewRobustZState(state.Config.RobustZWindow),
			}
			state.Series[point.Entity] = series
		}

		forecast, readyHW := series.Holt.Forecast()
		detections := make([]models.DetectionResult, 0)
		if readyHW {
			residual := point.Value - forecast
			series.Holt.RecordResidual(residual)
			mad := series.Holt.MAD()
			threshold := state.Config.Sensitivity * mad
			if mad > 0 && mathAbs(residual) > threshold {
				detections = append(detections, models.DetectionResult{
					Algorithm: "holt_winters",
					Score:     mathAbs(residual),
					Threshold: threshold,
					Details: map[string]any{
						"expected":     forecast,
						"seasonLength": state.Config.SeasonLength,
					},
				})
			}
		}

		score, readyZ := series.Robust.Score(point.Value)
		if readyZ {
			threshold := state.Config.RobustZThreshold
			if mathAbs(score) > threshold {
				detections = append(detections, models.DetectionResult{
					Algorithm: "robust_zscore",
					Score:     mathAbs(score),
					Threshold: threshold,
					Details: map[string]any{
						"medianWindow": state.Config.RobustZWindow,
					},
				})
			}
		}

		series.Holt.Update(point.Value)
		series.Robust.Add(point.Value)

		if len(detections) > 0 && !s.isSuppressed("metric:"+point.Metric, point.Entity, point.Timestamp) {
			anomaly := models.Anomaly{
				ID:           s.nextID(),
				Sequence:     s.nextSequence(),
				Timestamp:    point.Timestamp,
				Target:       "metric:" + point.Metric,
				Entity:       point.Entity,
				Metric:       point.Metric,
				Value:        point.Value,
				Expected:     forecast,
				Score:        detections[0].Score,
				Type:         anomalyTypeMetric,
				Explanations: detections,
			}
			s.anomalies = append(s.anomalies, anomaly)
			anomalies = append(anomalies, anomaly)
		}

		if logEvent {
			s.events = append(s.events, event{Type: "metric", Metric: &metricEvent{Point: point, Config: state.Config}})
		}
	}
	return anomalies, nil
}

func (s *Store) processRecord(record models.Record, logEvent bool) ([]models.Anomaly, error) {
	ds := s.datasets[record.Dataset]
	if ds == nil {
		return nil, nil
	}
	var anomalies []models.Anomaly
	for _, ruleID := range ds.RuleIDs {
		rule := s.rules[ruleID]
		if !rule.Enabled {
			continue
		}
		detections := make([]models.DetectionResult, 0)
		switch rule.Type {
		case ruleTypeDenial:
			if rule.Condition != nil && evaluateCondition(*rule.Condition, record.Values) {
				detections = append(detections, models.DetectionResult{
					Algorithm: "denial_constraint",
					Score:     1,
					Threshold: 0,
					Details:   map[string]any{"ruleId": rule.ID},
				})
			}
		case ruleTypeEntity:
			if len(rule.NotNullFields) > 0 {
				missing := []string{}
				for _, field := range rule.NotNullFields {
					if v, ok := record.Values[field]; !ok || v == nil || v == "" {
						missing = append(missing, field)
					}
				}
				if len(missing) > 0 {
					detections = append(detections, models.DetectionResult{
						Algorithm: "entity_integrity",
						Score:     float64(len(missing)),
						Threshold: 0,
						Details:   map[string]any{"missing": missing},
					})
				}
			}
			if len(rule.UniqueFields) > 0 {
				key, ok := normalizeKey(record.Values, rule.UniqueFields)
				if !ok {
					detections = append(detections, models.DetectionResult{
						Algorithm: "entity_integrity",
						Score:     1,
						Threshold: 0,
						Details:   map[string]any{"uniqueFields": rule.UniqueFields, "reason": "missing field"},
					})
				} else {
					tracker := ds.trackers[rule.ID]
					if tracker == nil {
						tracker = make(map[string]struct{})
						ds.trackers[rule.ID] = tracker
					}
					if _, exists := tracker[key]; exists {
						detections = append(detections, models.DetectionResult{
							Algorithm: "entity_integrity",
							Score:     1,
							Threshold: 0,
							Details:   map[string]any{"uniqueFields": rule.UniqueFields, "reason": "duplicate"},
						})
					} else {
						tracker[key] = struct{}{}
					}
				}
			}
		}
		if len(detections) > 0 && !s.isSuppressed("rule:"+rule.ID, "", record.Timestamp) {
			anomaly := models.Anomaly{
				ID:              s.nextID(),
				Sequence:        s.nextSequence(),
				Timestamp:       record.Timestamp,
				Target:          "rule:" + rule.ID,
				Type:            anomalyTypeRule,
				RuleID:          rule.ID,
				RuleDescription: rule.Description,
				Explanations:    detections,
				Payload:         record.Values,
			}
			s.anomalies = append(s.anomalies, anomaly)
			anomalies = append(anomalies, anomaly)
		}
	}
	if logEvent {
		payload := make(map[string]any, len(record.Values))
		for k, v := range record.Values {
			payload[k] = v
		}
		s.events = append(s.events, event{Type: "record", Record: &recordEvent{Dataset: record.Dataset, Timestamp: record.Timestamp, Values: payload}})
	}
	return anomalies, nil
}

// IngestMetricWithConfig is exported for replay usage.
func (s *Store) IngestMetricWithConfig(points []models.DataPoint, override *models.MetricConfig) ([]models.Anomaly, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.processMetric(points, override, true)
}

// EvaluateRecordWithEvent is exported for replay usage.
func (s *Store) EvaluateRecordWithEvent(record models.Record) ([]models.Anomaly, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.processRecord(record, true)
}

// MarshalConfig returns JSON configuration snapshot.
func (s *Store) MarshalConfig() ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	snapshot := struct {
		Metrics      map[string]models.MetricConfig `json:"metrics"`
		Rules        map[string]models.Rule         `json:"rules"`
		Suppressions []models.Suppression           `json:"suppressions"`
	}{
		Metrics:      make(map[string]models.MetricConfig),
		Rules:        make(map[string]models.Rule),
		Suppressions: append([]models.Suppression{}, s.suppressions...),
	}
	for metric, state := range s.metrics {
		snapshot.Metrics[metric] = state.Config
	}
	for id, rule := range s.rules {
		snapshot.Rules[id] = rule
	}
	return json.MarshalIndent(snapshot, "", "  ")
}

func mathAbs(val float64) float64 {
	if val < 0 {
		return -val
	}
	return val
}
