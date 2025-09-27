package plan

import (
	"fmt"

	"gonum.org/v1/gonum/stat/distuv"
)

// BayesianStopper evaluates whether a metric should halt the rollout based on beta posteriors.
type BayesianStopper struct {
	PriorAlpha float64
	PriorBeta  float64
}

// ProbabilityExceeds computes P(p > threshold | data) for a bernoulli rate with the configured prior.
func (b BayesianStopper) ProbabilityExceeds(eventCount, total int, threshold float64) float64 {
	if total <= 0 {
		return 0
	}
	alpha := b.PriorAlpha + float64(eventCount)
	beta := b.PriorBeta + float64(total-eventCount)
	distribution := distuv.Beta{Alpha: alpha, Beta: beta}
	return 1 - distribution.CDF(threshold)
}

// ProbabilityBelow computes P(p < threshold | data) for a bernoulli success rate.
func (b BayesianStopper) ProbabilityBelow(successCount, failureCount int, threshold float64) float64 {
	total := successCount + failureCount
	if total <= 0 {
		return 0
	}
	alpha := b.PriorAlpha + float64(successCount)
	beta := b.PriorBeta + float64(failureCount)
	distribution := distuv.Beta{Alpha: alpha, Beta: beta}
	return distribution.CDF(threshold)
}

// Validate ensures the prior parameters are suitable.
func (b BayesianStopper) Validate() error {
	if b.PriorAlpha <= 0 || b.PriorBeta <= 0 {
		return fmt.Errorf("invalid beta prior: alpha and beta must be > 0")
	}
	return nil
}
