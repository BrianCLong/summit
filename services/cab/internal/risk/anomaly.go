package risk

// AnomalyScorer thresholds anomaly scores into discrete risk levels.
type AnomalyScorer struct {
	Name        string
	StepUpFloor float64
	DenyFloor   float64
}

func (a AnomalyScorer) Score(in Input) Result {
	result := Result{Name: chooseName(a.Name, "anomaly")}
	score := in.Signals.AnomalyScore
	switch {
	case score < a.StepUpFloor:
		result.Level = LevelLow
		result.Score = score
		result.Reasons = []string{"anomaly score within baseline"}
	case score < a.DenyFloor:
		result.Level = LevelMedium
		result.Score = score
		result.Reasons = []string{"anomaly score suggests friction"}
	default:
		result.Level = LevelHigh
		result.Score = score
		result.Reasons = []string{"anomaly score exceeds deny floor"}
	}
	return result
}
