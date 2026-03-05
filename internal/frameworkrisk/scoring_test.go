package frameworkrisk

import (
    "testing"
)

func TestScore(t *testing.T) {
    cfg := DefaultConfig()

    signals := map[string]float64{
        "governance_opacity":      0.7,
        "infra_coupling":          0.8,
        "ecosystem_concentration": 0.6,
        "trust_volatility":        0.6,
    }

    // 0.7*0.3 + 0.8*0.3 + 0.6*0.2 + 0.6*0.2
    // 0.21 + 0.24 + 0.12 + 0.12
    // 0.69

    expected := 0.69
    actual := Score(signals, cfg)

    // float comparison within precision delta
    if actual > expected+0.001 || actual < expected-0.001 {
        t.Errorf("Expected %f, got %f", expected, actual)
    }
}

func TestEvaluateNextJSRisk(t *testing.T) {
    report := EvaluateNextJSRisk()

    if report.Framework != "nextjs" {
        t.Errorf("Expected framework to be nextjs, got %s", report.Framework)
    }

    if report.RiskScore < 0.68 || report.RiskScore > 0.70 { // Allowing for floating-point imprecision
        t.Errorf("Expected risk score ~0.69, got %f", report.RiskScore)
    }
}
