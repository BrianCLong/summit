package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"

	"github.com/summit/qpg/internal/policy"
	"github.com/summit/qpg/internal/tokenvault"
)

// LoadPolicies reads a YAML file and converts it into policy definitions.
func LoadPolicies(path string) ([]policy.Definition, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read policies: %w", err)
	}
	var defs []policy.Definition
	if err := yaml.Unmarshal(data, &defs); err != nil {
		return nil, fmt.Errorf("parse policies: %w", err)
	}
	return defs, nil
}

// LoadVault reads a YAML file describing quorum shares.
func LoadVault(path string) (*tokenvault.RecoveryGateConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read vault config: %w", err)
	}
	var cfg tokenvault.RecoveryGateConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse vault config: %w", err)
	}
	return &cfg, nil
}
