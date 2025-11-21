package risk

import "strings"

// GeoScorer flags access from locations outside the allowed list as elevated risk.
type GeoScorer struct {
	Name          string
	Allowed       []string
	Elevated      []string
	UnknownIsRisk bool
}

func (g GeoScorer) Score(in Input) Result {
	result := Result{Name: chooseName(g.Name, "geo")}
	region := strings.ToLower(strings.TrimSpace(in.Signals.Geo))
	if region == "" {
		result.Level = LevelMedium
		result.Score = 0.6
		result.Reasons = []string{"missing geo signal"}
		return result
	}

	for _, allowed := range g.Allowed {
		if region == strings.ToLower(strings.TrimSpace(allowed)) {
			result.Level = LevelLow
			result.Score = 0.1
			result.Reasons = []string{"geo within allowlist"}
			return result
		}
	}

	for _, elevated := range g.Elevated {
		if region == strings.ToLower(strings.TrimSpace(elevated)) {
			result.Level = LevelMedium
			result.Score = 0.7
			result.Reasons = []string{"geo requires step-up"}
			return result
		}
	}

	if g.UnknownIsRisk {
		result.Level = LevelHigh
		result.Score = 0.95
		result.Reasons = []string{"geo outside trust boundary"}
		return result
	}

	result.Level = LevelMedium
	result.Score = 0.75
	result.Reasons = []string{"geo not explicitly allowed"}
	return result
}
