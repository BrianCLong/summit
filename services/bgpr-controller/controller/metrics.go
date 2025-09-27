package controller

import (
	"crypto/sha256"
	"encoding/binary"
	"math"
)

type Metrics struct {
	BlockRate       float64 `json:"blockRate"`
	FnCanaryCatches float64 `json:"fnCanaryCatches"`
	LatencyMs       float64 `json:"latencyMs"`
}

type MetricsComparison struct {
	Canary  Metrics `json:"canary"`
	Control Metrics `json:"control"`
}

func deterministicFloat(seed string, min, max float64) float64 {
	hash := sha256.Sum256([]byte(seed))
	num := binary.BigEndian.Uint64(hash[:8])
	ratio := float64(num) / float64(math.MaxUint64)
	if ratio < 0 {
		ratio = 0
	}
	return min + ratio*(max-min)
}

func computeMetrics(manifest RolloutManifest, currentPolicy string) MetricsComparison {
	canarySeed := manifest.ID + "|" + manifest.PolicyVersion + "|" + join(manifest.CanaryPopulation)
	controlSeed := currentPolicy + "|" + join(manifest.ControlPopulation)
	return MetricsComparison{
		Canary: Metrics{
			BlockRate:       deterministicFloat(canarySeed+"block", 0.6, 0.999),
			FnCanaryCatches: deterministicFloat(canarySeed+"fn", 0, 25),
			LatencyMs:       deterministicFloat(canarySeed+"latency", 45, 120),
		},
		Control: Metrics{
			BlockRate:       deterministicFloat(controlSeed+"block", 0.6, 0.999),
			FnCanaryCatches: deterministicFloat(controlSeed+"fn", 0, 25),
			LatencyMs:       deterministicFloat(controlSeed+"latency", 45, 120),
		},
	}
}

func join(values []string) string {
	result := make([]byte, 0)
	for i, v := range values {
		if i > 0 {
			result = append(result, ',')
		}
		result = append(result, v...)
	}
	return string(result)
}
