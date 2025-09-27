package config

import (
	"fmt"
	"os"
	"sort"
	"time"

	"gopkg.in/yaml.v3"
)

type Mode string

const (
	ModeStrong           Mode = "strong"
	ModeBoundedStaleness      = "bounded-staleness"
	ModeReadMyWrites          = "read-my-writes"
)

type PolicyRule struct {
	DataClass    string        `yaml:"dataClass" json:"dataClass"`
	Purpose      string        `yaml:"purpose" json:"purpose"`
	Jurisdiction string        `yaml:"jurisdiction" json:"jurisdiction"`
	Mode         Mode          `yaml:"mode" json:"mode"`
	StalenessSLA time.Duration `yaml:"stalenessSlaMs" json:"stalenessSlaMs"`
}

type Replica struct {
	Name             string `yaml:"name" json:"name"`
	Region           string `yaml:"region" json:"region"`
	Role             string `yaml:"role" json:"role"`
	Synchronous      bool   `yaml:"synchronous" json:"synchronous"`
	DefaultLatencyMs int    `yaml:"defaultLatencyMs" json:"defaultLatencyMs"`
}

type Config struct {
	Policies []PolicyRule `yaml:"policies" json:"policies"`
	Replicas []Replica    `yaml:"replicas" json:"replicas"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read policy config: %w", err)
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse policy config: %w", err)
	}
	for i := range cfg.Policies {
		if cfg.Policies[i].StalenessSLA == 0 && cfg.Policies[i].Mode == ModeBoundedStaleness {
			cfg.Policies[i].StalenessSLA = 150 * time.Millisecond
		}
	}
	sort.SliceStable(cfg.Policies, func(i, j int) bool {
		iSpec := specificity(cfg.Policies[i])
		jSpec := specificity(cfg.Policies[j])
		if iSpec == jSpec {
			if cfg.Policies[i].DataClass == cfg.Policies[j].DataClass {
				if cfg.Policies[i].Purpose == cfg.Policies[j].Purpose {
					return cfg.Policies[i].Jurisdiction < cfg.Policies[j].Jurisdiction
				}
				return cfg.Policies[i].Purpose < cfg.Policies[j].Purpose
			}
			return cfg.Policies[i].DataClass < cfg.Policies[j].DataClass
		}
		return iSpec > jSpec
	})
	return &cfg, nil
}

func specificity(rule PolicyRule) int {
	count := 0
	if rule.DataClass != "*" && rule.DataClass != "" {
		count++
	}
	if rule.Purpose != "*" && rule.Purpose != "" {
		count++
	}
	if rule.Jurisdiction != "*" && rule.Jurisdiction != "" {
		count++
	}
	return count
}
