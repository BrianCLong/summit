package model

import "errors"

// Model defines the interface required by the sentinel for any shadow model.
type Model interface {
	Predict(features map[string]float64) (float64, error)
}

// LinearModel is a lightweight deterministic model used for sampling traffic in tests
// and offline replays. The model simply performs a weighted sum over the provided
// features plus a bias term.
type LinearModel struct {
	Weights map[string]float64
	Bias    float64
}

// Predict returns the weighted sum of the provided features. Missing feature values
// are treated as zero. If no weights are configured the method returns an error so the
// caller can surface the misconfiguration early.
func (m *LinearModel) Predict(features map[string]float64) (float64, error) {
	if len(m.Weights) == 0 {
		return 0, errors.New("linear model has no weights configured")
	}
	var sum float64
	for name, weight := range m.Weights {
		sum += features[name] * weight
	}
	return sum + m.Bias, nil
}
