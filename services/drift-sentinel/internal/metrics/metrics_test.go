package metrics

import "testing"

func TestPopulationStabilityIndex(t *testing.T) {
	expected := []float64{0.1, 0.2, 0.3, 0.4, 0.5}
	actual := []float64{0.5, 0.6, 0.7, 0.8, 0.9}
	psi := PopulationStabilityIndex(expected, actual, 5)
	if psi <= 0 {
		t.Fatalf("expected positive PSI, got %f", psi)
	}
}

func TestKLDivergence(t *testing.T) {
	production := []float64{1, 1, 1, 1}
	shadow := []float64{1, 2, 3, 4}
	kl := KLDivergence(production, shadow, 4)
	if kl <= 0 {
		t.Fatalf("expected positive KL divergence, got %f", kl)
	}
}

func TestErrorDelta(t *testing.T) {
	production := []float64{1, 1, 1}
	shadow := []float64{2, 2, 2}
	actual := []float64{1, 1, 1}
	delta := ErrorDelta(production, shadow, actual)
	if delta <= 0 {
		t.Fatalf("expected positive error delta, got %f", delta)
	}
}
