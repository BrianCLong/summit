package frameworkrisk

// Config contains parameters for scoring
type Config struct {
    GovernanceOpacityWeight     float64
    InfraCouplingWeight         float64
    EcosystemConcentrationWeight float64
    TrustVolatilityWeight       float64
}

// DefaultConfig returns the standard weightings.
func DefaultConfig() Config {
    return Config{
        GovernanceOpacityWeight:      0.30,
        InfraCouplingWeight:          0.30,
        EcosystemConcentrationWeight: 0.20,
        TrustVolatilityWeight:        0.20,
    }
}

// Score Calculates the risk score using deterministic inputs.
// Signals: Governance Opacity, Infra Coupling, Ecosystem Concentration, Trust Volatility
func Score(signals map[string]float64, cfg Config) float64 {
    var score float64

    if val, ok := signals["governance_opacity"]; ok {
        score += val * cfg.GovernanceOpacityWeight
    }
    if val, ok := signals["infra_coupling"]; ok {
        score += val * cfg.InfraCouplingWeight
    }
    if val, ok := signals["ecosystem_concentration"]; ok {
        score += val * cfg.EcosystemConcentrationWeight
    }
    if val, ok := signals["trust_volatility"]; ok {
        score += val * cfg.TrustVolatilityWeight
    }

    return score
}

// EvaluateNextJSRisk generates a standardized risk report for Next.js.
// In a real system, these heuristic values would be derived from static analysis of dependencies.
// Here we use deterministic defaults representing the current subsumption claim.
func EvaluateNextJSRisk() FrameworkRiskReport {
    signals := map[string]float64{
        "governance_opacity":      0.7,
        "infra_coupling":          0.8,
        "ecosystem_concentration": 0.6,
        "trust_volatility":        0.6,
    }

    score := Score(signals, DefaultConfig())

    var governanceSignals []GovernanceSignal
    // Ensure deterministic ordering (alphabetical by name or defined structure)
    // Ecosystem Concentration
    governanceSignals = append(governanceSignals, GovernanceSignal{
        Name:       "ecosystem_concentration",
        Value:      signals["ecosystem_concentration"],
        EvidenceID: "EVD-NEXTJS-DOMINANCE-001",
    })
    // Governance Opacity
    governanceSignals = append(governanceSignals, GovernanceSignal{
        Name:       "governance_opacity",
        Value:      signals["governance_opacity"],
        EvidenceID: "EVD-NEXTJS-GOVOPACITY-001",
    })
    // Infra Coupling
    governanceSignals = append(governanceSignals, GovernanceSignal{
        Name:       "infra_coupling",
        Value:      signals["infra_coupling"],
        EvidenceID: "EVD-NEXTJS-INFRACOUPLE-001",
    })
    // Trust Volatility
    governanceSignals = append(governanceSignals, GovernanceSignal{
        Name:       "trust_volatility",
        Value:      signals["trust_volatility"],
        EvidenceID: "EVD-NEXTJS-TRUSTVOL-001",
    })

    return FrameworkRiskReport{
        Framework: "nextjs",
        RiskScore: score,
        Signals:   governanceSignals,
    }
}
