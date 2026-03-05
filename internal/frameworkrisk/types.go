package frameworkrisk

type GovernanceSignal struct {
    Name       string  `json:"name"`
    Value      float64 `json:"value"`
    EvidenceID string  `json:"evidence_id"`
}

type FrameworkRiskReport struct {
    Framework string             `json:"framework"`
    RiskScore float64            `json:"risk_score"`
    Signals   []GovernanceSignal `json:"signals"`
}
