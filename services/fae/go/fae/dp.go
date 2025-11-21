package fae

import (
	"math"
	"math/rand"
)

// ApplyDPLaplace applies Laplace noise with deterministic seed for reproducibility.
func ApplyDPLaplace(values []float64, epsilon, sensitivity float64, seed int64) []float64 {
	if epsilon <= 0 {
		copied := make([]float64, len(values))
		copy(copied, values)
		return copied
	}
	scale := sensitivity / epsilon
	rng := rand.New(rand.NewSource(seed))
	noisy := make([]float64, len(values))
	for i, v := range values {
		u := rng.Float64() - 0.5
		noise := -scale * math.Copysign(math.Log(1-2*math.Abs(u)), u)
		noisy[i] = v + noise
	}
	return noisy
}
