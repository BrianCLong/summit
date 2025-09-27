package core

import (
	"testing"
	"time"

	"summit/services/cdqd/internal/models"
)

func TestHoltWintersAnomalyDetection(t *testing.T) {
	store := NewStore()
	metric := "cpu.util"
	entity := "node-a"
	baseTime := time.Unix(0, 0)

	var points []models.DataPoint
	for i := 0; i < 96; i++ {
		value := 50.0
		if i%24 < 12 {
			value = 30.0
		}
		points = append(points, models.DataPoint{
			Metric:    metric,
			Entity:    entity,
			Timestamp: baseTime.Add(time.Hour * time.Duration(i)),
			Value:     value,
		})
	}
	_, err := store.IngestMetric(points, &models.MetricConfig{SeasonLength: 24})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	spike := models.DataPoint{
		Metric:    metric,
		Entity:    entity,
		Timestamp: baseTime.Add(96 * time.Hour),
		Value:     200,
	}
	anomalies, err := store.IngestMetric([]models.DataPoint{spike}, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(anomalies) == 0 {
		t.Fatalf("expected anomaly but got none")
	}
	if anomalies[0].Metric != metric {
		t.Fatalf("expected metric %s, got %s", metric, anomalies[0].Metric)
	}
}

func TestDenialConstraintViolation(t *testing.T) {
	store := NewStore()
	rule := models.Rule{
		ID:          "payments-no-negatives",
		Dataset:     "payments",
		Type:        "denial_constraint",
		Description: "Amounts must be non-negative",
		Condition: &models.Condition{
			Field:    "amount",
			Operator: "lt",
			Value:    0,
		},
	}
	if err := store.AddRule(rule); err != nil {
		t.Fatalf("failed to add rule: %v", err)
	}

	record := models.Record{
		Dataset:   "payments",
		Timestamp: time.Now(),
		Values: map[string]any{
			"id":     "txn-1",
			"amount": -100,
		},
	}
	anomalies, err := store.EvaluateRecord(record)
	if err != nil {
		t.Fatalf("evaluate record failed: %v", err)
	}
	if len(anomalies) != 1 {
		t.Fatalf("expected 1 anomaly, got %d", len(anomalies))
	}
	if anomalies[0].RuleID != rule.ID {
		t.Fatalf("expected rule %s triggered", rule.ID)
	}
}

func TestSuppressionPreventsFlapping(t *testing.T) {
	store := NewStore()
	metric := "latency"
	entity := "service-1"
	baseTime := time.Unix(0, 0)

	var points []models.DataPoint
	for i := 0; i < 60; i++ {
		points = append(points, models.DataPoint{
			Metric:    metric,
			Entity:    entity,
			Timestamp: baseTime.Add(time.Minute * time.Duration(i)),
			Value:     10,
		})
	}
	if _, err := store.IngestMetric(points, &models.MetricConfig{SeasonLength: 12}); err != nil {
		t.Fatalf("failed to seed metric: %v", err)
	}

	if _, err := store.IngestMetric([]models.DataPoint{{
		Metric:    metric,
		Entity:    entity,
		Timestamp: baseTime.Add(61 * time.Minute),
		Value:     200,
	}}, nil); err != nil {
		t.Fatalf("failed to insert anomaly point: %v", err)
	}

	sup := models.Suppression{
		Target: "metric:" + metric,
		Entity: entity,
		Start:  baseTime.Add(60 * time.Minute),
		End:    baseTime.Add(180 * time.Minute),
		Reason: "maintenance window",
	}
	if err := store.AddSuppression(sup); err != nil {
		t.Fatalf("add suppression failed: %v", err)
	}

	anomalies, err := store.IngestMetric([]models.DataPoint{{
		Metric:    metric,
		Entity:    entity,
		Timestamp: baseTime.Add(70 * time.Minute),
		Value:     220,
	}}, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(anomalies) != 0 {
		t.Fatalf("expected suppression to yield no anomalies, got %d", len(anomalies))
	}
}

func TestReplayDeterministic(t *testing.T) {
	store := NewStore()
	metric := "errors"
	entity := "service"
	baseTime := time.Unix(0, 0)

	var baseline []models.DataPoint
	for i := 0; i < 48; i++ {
		baseline = append(baseline, models.DataPoint{
			Metric:    metric,
			Entity:    entity,
			Timestamp: baseTime.Add(time.Hour * time.Duration(i)),
			Value:     5,
		})
	}
	if _, err := store.IngestMetric(baseline, &models.MetricConfig{SeasonLength: 24}); err != nil {
		t.Fatalf("failed to ingest baseline: %v", err)
	}
	if _, err := store.IngestMetric([]models.DataPoint{{
		Metric:    metric,
		Entity:    entity,
		Timestamp: baseTime.Add(49 * time.Hour),
		Value:     30,
	}}, nil); err != nil {
		t.Fatalf("failed to ingest anomaly: %v", err)
	}

	result, err := store.Replay()
	if err != nil {
		t.Fatalf("replay failed: %v", err)
	}
	if !result.Matched {
		t.Fatalf("expected replay to match alert sequence")
	}
}
