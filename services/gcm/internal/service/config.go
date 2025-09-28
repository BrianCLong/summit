package service

import (
	"errors"
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// LoadConfig loads configuration from a YAML file or returns an error.
func LoadConfig(path string) (Config, error) {
	if path == "" {
		return DefaultConfig(), nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parse config: %w", err)
	}

	if len(cfg.Policies) == 0 {
		return Config{}, errors.New("config must define at least one policy")
	}

	if cfg.Currency == "" {
		cfg.Currency = "USD"
	}

	for i := range cfg.Policies {
		if cfg.Policies[i].Budget.Currency == "" {
			cfg.Policies[i].Budget.Currency = cfg.Currency
		}
	}

	return cfg, nil
}

// DefaultConfig returns a sample configuration useful for development and tests.
func DefaultConfig() Config {
	return Config{
		Currency: "USD",
		Policies: []PolicyConfig{
			{
				PolicyTier: "pii.high",
				Residency:  "eu",
				Rates: RateCard{
					CPUPerHour:   0.52,
					StoragePerGB: 0.14,
					EgressPerGB:  0.18,
				},
				Budget: BudgetConfig{
					MonthlyLimit: 1200,
					Currency:     "USD",
					AccountLimits: map[string]float64{
						"risk-lab": 1500,
					},
				},
			},
			{
				PolicyTier: "pii.medium",
				Residency:  "us",
				Rates: RateCard{
					CPUPerHour:   0.37,
					StoragePerGB: 0.09,
					EgressPerGB:  0.11,
				},
				Budget: BudgetConfig{
					MonthlyLimit: 900,
					Currency:     "USD",
				},
			},
			{
				PolicyTier: "pii.low",
				Residency:  "global",
				Rates: RateCard{
					CPUPerHour:   0.19,
					StoragePerGB: 0.05,
					EgressPerGB:  0.07,
				},
				Budget: BudgetConfig{
					MonthlyLimit: 600,
					Currency:     "USD",
				},
			},
		},
	}
}
