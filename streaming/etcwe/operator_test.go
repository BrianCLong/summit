package etcwe

import (
	"testing"
	"time"
)

func fixedTime(year int, month time.Month, day, hour, min, sec int) time.Time {
	return time.Date(year, month, day, hour, min, sec, 0, time.UTC)
}

func TestInitialDecisionEmission(t *testing.T) {
	policy := Policy{WindowSize: time.Minute, AllowedLateness: 30 * time.Second}
	op, err := NewOperator(policy)
	if err != nil {
		t.Fatalf("failed to create operator: %v", err)
	}

	event := Event{
		ID:             "evt-1",
		Key:            "account-42",
		EventTime:      fixedTime(2024, time.March, 10, 10, 0, 0),
		ProcessingTime: fixedTime(2024, time.March, 10, 10, 0, 5),
		Value:          5,
	}

	result := op.ProcessEvent(event)
	if len(result.Decisions) != 1 {
		t.Fatalf("expected 1 decision, got %d", len(result.Decisions))
	}

	decision := result.Decisions[0]
	if decision.Kind != DecisionKindInitial {
		t.Fatalf("expected initial decision, got %s", decision.Kind)
	}
	if decision.Value != 5 {
		t.Fatalf("unexpected decision value: %v", decision.Value)
	}
	if decision.Version != 1 {
		t.Fatalf("expected version 1, got %d", decision.Version)
	}

	if len(result.Audits) != 1 {
		t.Fatalf("expected 1 audit record, got %d", len(result.Audits))
	}
	if result.Audits[0].Action != AuditActionDecision {
		t.Fatalf("expected decision audit, got %s", result.Audits[0].Action)
	}
	if len(result.Quarantined) != 0 {
		t.Fatalf("expected no quarantined events, got %d", len(result.Quarantined))
	}
}

func TestLateEventWithinAllowedLatenessProducesCorrection(t *testing.T) {
	policy := Policy{WindowSize: time.Minute, AllowedLateness: time.Minute}
	op, err := NewOperator(policy)
	if err != nil {
		t.Fatalf("failed to create operator: %v", err)
	}

	baseEvent := Event{
		ID:             "evt-1",
		Key:            "acct-9",
		EventTime:      fixedTime(2024, time.March, 10, 11, 0, 0),
		ProcessingTime: fixedTime(2024, time.March, 10, 11, 0, 10),
		Value:          10,
	}
	op.ProcessEvent(baseEvent)

	// watermark is ahead but still within allowed lateness for a 30s late event
	op.AdvanceWatermark(fixedTime(2024, time.March, 10, 11, 1, 0))

	lateEvent := Event{
		ID:             "evt-2",
		Key:            "acct-9",
		EventTime:      fixedTime(2024, time.March, 10, 11, 0, 30),
		ProcessingTime: fixedTime(2024, time.March, 10, 11, 1, 40),
		Value:          2,
	}

	result := op.ProcessEvent(lateEvent)
	if len(result.Decisions) != 1 {
		t.Fatalf("expected 1 decision, got %d", len(result.Decisions))
	}

	decision := result.Decisions[0]
	if decision.Kind != DecisionKindCorrection {
		t.Fatalf("expected correction, got %s", decision.Kind)
	}
	if decision.Value != 12 {
		t.Fatalf("expected aggregate 12, got %v", decision.Value)
	}
	if decision.Version != 2 {
		t.Fatalf("expected version 2, got %d", decision.Version)
	}

	if len(result.Audits) != 1 {
		t.Fatalf("expected 1 audit record, got %d", len(result.Audits))
	}
	audit := result.Audits[0]
	if audit.Action != AuditActionCorrection {
		t.Fatalf("expected correction audit, got %s", audit.Action)
	}
	if audit.Lateness <= 0 {
		t.Fatalf("expected positive lateness, got %s", audit.Lateness)
	}
}

func TestEventBeyondAllowedLatenessIsQuarantined(t *testing.T) {
	policy := Policy{WindowSize: time.Minute, AllowedLateness: 30 * time.Second}
	op, err := NewOperator(policy)
	if err != nil {
		t.Fatalf("failed to create operator: %v", err)
	}

	first := Event{
		ID:             "evt-1",
		Key:            "acct-77",
		EventTime:      fixedTime(2024, time.April, 1, 9, 0, 0),
		ProcessingTime: fixedTime(2024, time.April, 1, 9, 0, 5),
		Value:          1,
	}
	op.ProcessEvent(first)

	// advance watermark to well past allowed lateness boundary
	op.AdvanceWatermark(fixedTime(2024, time.April, 1, 9, 2, 0))

	late := Event{
		ID:             "evt-2",
		Key:            "acct-77",
		EventTime:      fixedTime(2024, time.April, 1, 9, 0, 20),
		ProcessingTime: fixedTime(2024, time.April, 1, 9, 2, 5),
		Value:          3,
	}

	result := op.ProcessEvent(late)
	if len(result.Decisions) != 0 {
		t.Fatalf("expected no decisions, got %d", len(result.Decisions))
	}
	if len(result.Quarantined) != 1 {
		t.Fatalf("expected 1 quarantined event, got %d", len(result.Quarantined))
	}
	if len(result.Audits) != 1 {
		t.Fatalf("expected 1 audit record, got %d", len(result.Audits))
	}
	if result.Audits[0].Action != AuditActionQuarantined {
		t.Fatalf("expected quarantine audit, got %s", result.Audits[0].Action)
	}
}

func TestAdvanceWatermarkFinalizesWindow(t *testing.T) {
	policy := Policy{WindowSize: time.Minute, AllowedLateness: 30 * time.Second}
	op, err := NewOperator(policy)
	if err != nil {
		t.Fatalf("failed to create operator: %v", err)
	}

	evt := Event{
		ID:             "evt-1",
		Key:            "acct-1",
		EventTime:      fixedTime(2024, time.May, 5, 15, 0, 0),
		ProcessingTime: fixedTime(2024, time.May, 5, 15, 0, 10),
		Value:          4,
	}
	op.ProcessEvent(evt)

	watermarkResult := op.AdvanceWatermark(fixedTime(2024, time.May, 5, 15, 2, 0))
	if len(watermarkResult.Decisions) != 1 {
		t.Fatalf("expected finalization decision, got %d", len(watermarkResult.Decisions))
	}
	decision := watermarkResult.Decisions[0]
	if !decision.Final || decision.Kind != DecisionKindFinalized {
		t.Fatalf("expected finalized decision, got %+v", decision)
	}
	if decision.Value != 4 {
		t.Fatalf("unexpected final value: %v", decision.Value)
	}

	if len(watermarkResult.Audits) != 1 {
		t.Fatalf("expected 1 audit for finalization, got %d", len(watermarkResult.Audits))
	}
	if watermarkResult.Audits[0].Action != AuditActionFinalized {
		t.Fatalf("expected finalized audit, got %s", watermarkResult.Audits[0].Action)
	}
}
