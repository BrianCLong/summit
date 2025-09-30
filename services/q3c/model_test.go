package main

import "testing"

func TestEstimateWithinErrorBounds(t *testing.T) {
	model := NewDefaultModel()

	benchmarks := []struct {
		name         string
		region       string
		usage        ResourceUsage
		actualCost   float64
		actualCarbon float64
	}{
		{
			name:   "steady-us",
			region: "us-east-1",
			usage: ResourceUsage{
				CPUSeconds: 3600,
				RAMGbHours: 16,
				IOGb:       50,
				EgressGb:   20,
			},
			actualCost:   6.8658064,
			actualCarbon: 0.0517751142,
		},
		{
			name:   "bursty-eu",
			region: "eu-west-1",
			usage: ResourceUsage{
				CPUSeconds: 14400,
				RAMGbHours: 128,
				IOGb:       150,
				EgressGb:   120,
			},
			actualCost:   22.967352,
			actualCarbon: 0.206388722,
		},
	}

	for _, bm := range benchmarks {
		t.Run(bm.name, func(t *testing.T) {
			estimate, err := model.Estimate(bm.region, bm.usage)
			if err != nil {
				t.Fatalf("estimate failed: %v", err)
			}

			diffCost := absFloat((estimate.CostUSD - bm.actualCost) / bm.actualCost)
			if diffCost > model.errorMargin {
				t.Fatalf("cost error %.4f exceeds margin %.2f", diffCost, model.errorMargin)
			}

			diffCarbon := absFloat((estimate.CarbonKg - bm.actualCarbon) / bm.actualCarbon)
			if diffCarbon > model.errorMargin {
				t.Fatalf("carbon error %.4f exceeds margin %.2f", diffCarbon, model.errorMargin)
			}
		})
	}
}

func absFloat(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}
