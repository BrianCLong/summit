package metrics

import (
	"math"
	"sort"
)

// PopulationStabilityIndex calculates the PSI between the production distribution
// (expected) and the observed shadow model distribution (actual). Both slices must
// contain at least one element otherwise the function returns 0.
func PopulationStabilityIndex(expected, actual []float64, bins int) float64 {
	if len(expected) == 0 || len(actual) == 0 {
		return 0
	}
	if bins <= 0 {
		bins = 10
	}

	edges := binEdges(expected, actual, bins)
	expectedHist := histogram(expected, edges)
	actualHist := histogram(actual, edges)

	const epsilon = 1e-9
	var psi float64
	for i := 0; i < len(expectedHist); i++ {
		e := expectedHist[i]
		a := actualHist[i]
		if e <= 0 {
			e = epsilon
		}
		if a <= 0 {
			a = epsilon
		}
		psi += (a - e) * math.Log(a/e)
	}
	return psi
}

// KLDivergence computes the KL divergence between the production and shadow output
// distributions. Values are expressed in natural units (nats).
func KLDivergence(production, shadow []float64, bins int) float64 {
	if len(production) == 0 || len(shadow) == 0 {
		return 0
	}
	if bins <= 0 {
		bins = 10
	}
	edges := binEdges(production, shadow, bins)
	p := histogram(production, edges)
	q := histogram(shadow, edges)

	const epsilon = 1e-12
	var kl float64
	for i := range p {
		pi := p[i]
		qi := q[i]
		if pi <= 0 {
			continue
		}
		if qi <= 0 {
			qi = epsilon
		}
		kl += pi * math.Log(pi/qi)
	}
	return kl
}

// ErrorDelta returns the difference between the shadow model's average absolute error
// and the production model's average absolute error relative to ground truth labels.
// Positive values indicate that the shadow model is performing worse than production.
func ErrorDelta(production, shadow, actual []float64) float64 {
	if len(actual) == 0 || len(production) == 0 || len(shadow) == 0 {
		return 0
	}
	n := min(len(actual), min(len(production), len(shadow)))
	var prodErr, shadowErr float64
	for i := 0; i < n; i++ {
		prodErr += math.Abs(actual[i] - production[i])
		shadowErr += math.Abs(actual[i] - shadow[i])
	}
	if n == 0 {
		return 0
	}
	prodErr /= float64(n)
	shadowErr /= float64(n)
	return shadowErr - prodErr
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func binEdges(a, b []float64, bins int) []float64 {
	combined := append(append([]float64{}, a...), b...)
	sort.Float64s(combined)
	minVal := combined[0]
	maxVal := combined[len(combined)-1]
	if minVal == maxVal {
		minVal -= 0.5
		maxVal += 0.5
	}
	width := (maxVal - minVal) / float64(bins)
	edges := make([]float64, bins+1)
	for i := 0; i <= bins; i++ {
		edges[i] = minVal + float64(i)*width
	}
	edges[len(edges)-1] = maxVal + 1e-9
	return edges
}

func histogram(values []float64, edges []float64) []float64 {
	counts := make([]float64, len(edges)-1)
	if len(values) == 0 {
		return counts
	}
	for _, v := range values {
		for i := 0; i < len(edges)-1; i++ {
			if v >= edges[i] && v < edges[i+1] {
				counts[i]++
				break
			}
			if i == len(edges)-2 && v >= edges[i+1] {
				counts[i]++
			}
		}
	}
	total := float64(len(values))
	for i := range counts {
		counts[i] /= total
	}
	return counts
}
