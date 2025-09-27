package jpr_test

import (
	"os"
	"testing"
	"time"

	"github.com/summit/jpr"
)

func TestEngineDeterministicDecision(t *testing.T) {
	engine := compileTestEngine(t)
	subject := jpr.Subject{DataClass: "sensitive"}
	ctx := jpr.Context{Jurisdiction: "DE", Purpose: "marketing", DecisionTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC)}

	first, err := engine.Can("share", subject, ctx)
	if err != nil {
		t.Fatalf("first evaluation failed: %v", err)
	}
	second, err := engine.Can("share", subject, ctx)
	if err != nil {
		t.Fatalf("second evaluation failed: %v", err)
	}

	if first != second {
		t.Fatalf("decisions differ: %#v vs %#v", first, second)
	}

	if !first.Allowed && first.PolicyID != "rule-deny-sensitive" {
		t.Fatalf("unexpected policy id: %+v", first)
	}
}

func TestExplainChain(t *testing.T) {
	engine := compileTestEngine(t)
	subject := jpr.Subject{DataClass: "sensitive"}
	ctx := jpr.Context{Jurisdiction: "DE", Purpose: "marketing", DecisionTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC)}

	explanation, err := engine.Explain("share", subject, ctx)
	if err != nil {
		t.Fatalf("explain failed: %v", err)
	}

	if len(explanation.Chain) == 0 {
		t.Fatalf("expected non-empty chain")
	}

	if explanation.Chain[0].PolicyID != "rule-deny-sensitive" {
		t.Fatalf("unexpected first rule: %#v", explanation.Chain[0])
	}

	if explanation.Decision.PolicyID != "rule-deny-sensitive" {
		t.Fatalf("unexpected decision policy: %#v", explanation.Decision)
	}
}

func TestDefaultEffect(t *testing.T) {
	engine := compileTestEngine(t)
	subject := jpr.Subject{DataClass: "public"}
	ctx := jpr.Context{Jurisdiction: "US", Purpose: "unknown", DecisionTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC)}

	decision, err := engine.Can("process", subject, ctx)
	if err != nil {
		t.Fatalf("can failed: %v", err)
	}

	if decision.Allowed {
		t.Fatalf("expected deny by default, got %#v", decision)
	}
}

func compileTestEngine(t *testing.T) *jpr.Engine {
	t.Helper()
	f, err := os.Open("testdata/policies.yaml")
	if err != nil {
		t.Fatalf("open policies: %v", err)
	}
	defer f.Close()

	doc, err := jpr.Parse(f)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}

	engine, err := jpr.Compile(doc, time.Minute)
	if err != nil {
		t.Fatalf("compile: %v", err)
	}
	return engine
}

func BenchmarkEngineCan(b *testing.B) {
	engine := compileBenchmarkEngine(b)
	subject := jpr.Subject{DataClass: "sensitive"}
	ctx := jpr.Context{Jurisdiction: "DE", Purpose: "marketing", DecisionTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC)}

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		if _, err := engine.Can("share", subject, ctx); err != nil {
			b.Fatalf("can failed: %v", err)
		}
	}
}

func compileBenchmarkEngine(b *testing.B) *jpr.Engine {
	b.Helper()
	f, err := os.Open("testdata/policies.yaml")
	if err != nil {
		b.Fatalf("open policies: %v", err)
	}
	defer f.Close()

	doc, err := jpr.Parse(f)
	if err != nil {
		b.Fatalf("parse: %v", err)
	}

	engine, err := jpr.Compile(doc, time.Minute)
	if err != nil {
		b.Fatalf("compile: %v", err)
	}
	return engine
}
