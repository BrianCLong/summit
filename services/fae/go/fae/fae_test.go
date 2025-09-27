package fae

import (
	"encoding/json"
	"testing"
)

func fixtureAggregates() (CupedAggregate, CupedAggregate, map[string]float64) {
	control := CupedAggregate{
		N:     1,
		SumY:  1.2,
		SumY2: 1.44,
		SumX:  0.8,
		SumX2: 0.64,
		SumXY: 0.96,
	}
	treatment := CupedAggregate{
		N:     1,
		SumY:  1.6,
		SumY2: 2.56,
		SumX:  1.0,
		SumX2: 1.0,
		SumXY: 1.6,
	}
	paths := map[string]float64{
		"email>search": 1,
		"email>social": 1,
	}
	return control, treatment, paths
}

func TestCupedMatchesFixture(t *testing.T) {
	control, treatment, _ := fixtureAggregates()
	result := ComputeCupedUplift(control, treatment)
	if result.Uplift <= 0 {
		t.Fatalf("expected positive uplift, got %v", result.Uplift)
	}
}

func TestAttributionSharesSumToOne(t *testing.T) {
	_, _, paths := fixtureAggregates()
	shapley := ShapleyAttribution(paths)
	total := 0.0
	for _, value := range shapley {
		total += value
	}
	if total < 0.99 || total > 1.01 {
		t.Fatalf("shapley share sum = %v", total)
	}
	markov := MarkovAttribution(paths)
	total = 0.0
	for _, value := range markov {
		total += value
	}
	if total < 0.99 || total > 1.01 {
		t.Fatalf("markov share sum = %v", total)
	}
}

func TestDPNoiseDeterministic(t *testing.T) {
	values := []float64{1, 2}
	noisy := ApplyDPLaplace(values, 0.5, 1, 42)
	noisy2 := ApplyDPLaplace(values, 0.5, 1, 42)
	for i := range noisy {
		if noisy[i] != noisy2[i] {
			t.Fatalf("dp noise not deterministic")
		}
	}
}

func TestReportSignature(t *testing.T) {
	payload := map[string]any{"uplift": 0.1}
	secret := "secret"
	report1, err := GenerateReport(payload, secret)
	if err != nil {
		t.Fatalf("generate report: %v", err)
	}
	report2, err := GenerateReport(payload, secret)
	if err != nil {
		t.Fatalf("generate report: %v", err)
	}
	if string(report1) != string(report2) {
		t.Fatalf("reports differ: %s vs %s", report1, report2)
	}
	ok, err := VerifyReport(report1, secret)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !ok {
		t.Fatalf("expected verification to succeed")
	}
	// mutate payload to ensure verification fails
	var doc map[string]any
	if err := json.Unmarshal(report1, &doc); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	doc["payload"].(map[string]any)["uplift"] = 0.2
	tampered, err := json.Marshal(doc)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	ok, err = VerifyReport(tampered, secret)
	if err != nil {
		t.Fatalf("verify tampered: %v", err)
	}
	if ok {
		t.Fatalf("expected tampered report to fail")
	}
}
