package rarl

import "time"

// Config defines the rate limiter configuration for all tenants.
type Config struct {
	Secret        string                  `json:"secret"`
	WindowSeconds int                     `json:"windowSeconds"`
	Tenants       map[string]TenantConfig `json:"tenants"`
}

// TenantConfig groups per-tool limits for a tenant.
type TenantConfig struct {
	Tools map[string]ToolConfig `json:"tools"`
}

// ToolConfig describes quota behaviour for a specific tool.
type ToolConfig struct {
	BaseLimit     int                           `json:"baseLimit"`
	BurstCredits  int                           `json:"burstCredits"`
	PriorityLanes map[string]PriorityLaneConfig `json:"priorityLanes"`
	Risk          RiskConfig                    `json:"risk"`
}

// PriorityLaneConfig provides lane-specific overrides.
type PriorityLaneConfig struct {
	Multiplier float64 `json:"multiplier"`
	BurstBonus int     `json:"burstBonus"`
}

// RiskConfig captures multipliers that adapt limits based on context.
type RiskConfig struct {
	DefaultMultiplier         float64            `json:"defaultMultiplier"`
	AnomalyBuckets            []AnomalyBucket    `json:"anomalyBuckets"`
	GeoMultipliers            map[string]float64 `json:"geoMultipliers"`
	PolicyTierMultipliers     map[string]float64 `json:"policyTierMultipliers"`
	HighRiskPenaltyMultiplier float64            `json:"highRiskPenaltyMultiplier"`
}

// AnomalyBucket defines a multiplier when an anomaly score falls within [Min, Max).
type AnomalyBucket struct {
	Min        float64 `json:"min"`
	Max        float64 `json:"max"`
	Multiplier float64 `json:"multiplier"`
}

// WindowDuration returns the configured window size; defaults to one minute.
func (c Config) WindowDuration() time.Duration {
	if c.WindowSeconds <= 0 {
		return time.Minute
	}
	return time.Duration(c.WindowSeconds) * time.Second
}
