package config

import (
	"errors"
	"fmt"
	"time"

	"gopkg.in/yaml.v3"
)

// Config represents the runtime configuration for the QSET service.
type Config struct {
	Approvers []ApproverConfig `yaml:"approvers"`
	Quorum    int              `yaml:"quorum"`
	Tools     []ToolConfig     `yaml:"tools"`
	Ledger    LedgerConfig     `yaml:"ledger"`
}

// ApproverConfig defines an individual approver and their API key.
type ApproverConfig struct {
	Name string `yaml:"name"`
	Key  string `yaml:"key"`
}

// ToolConfig captures the policy metadata for an issuable tool.
type ToolConfig struct {
	ID          string   `yaml:"id"`
	Description string   `yaml:"description"`
	Scopes      []string `yaml:"scopes"`
	MaxDuration Duration `yaml:"maxDuration"`
}

// LedgerConfig configures append-only ledger behavior.
type LedgerConfig struct {
	Path      string `yaml:"path"`
	SecretKey string `yaml:"secretKey"`
}

// Duration wraps time.Duration for YAML parsing.
type Duration struct {
	time.Duration
}

// UnmarshalYAML implements the yaml.Unmarshaler interface.
func (d *Duration) UnmarshalYAML(value *yaml.Node) error {
	if value.Tag == "!!null" {
		*d = Duration{}
		return nil
	}
	var raw string
	if err := value.Decode(&raw); err != nil {
		return err
	}
	dur, err := time.ParseDuration(raw)
	if err != nil {
		return err
	}
	d.Duration = dur
	return nil
}

// MarshalYAML implements yaml.Marshaler.
func (d Duration) MarshalYAML() (interface{}, error) {
	if d.Duration == 0 {
		return nil, nil
	}
	return d.String(), nil
}

// Validate performs structural validation over the configuration.
func (c Config) Validate() error {
	if len(c.Approvers) == 0 {
		return errors.New("at least one approver must be configured")
	}
	if c.Quorum <= 0 {
		return errors.New("quorum must be positive")
	}
	if c.Quorum > len(c.Approvers) {
		return fmt.Errorf("quorum %d exceeds number of approvers %d", c.Quorum, len(c.Approvers))
	}
	if len(c.Tools) == 0 {
		return errors.New("at least one tool must be configured")
	}
	toolIDs := map[string]struct{}{}
	for _, tool := range c.Tools {
		if tool.ID == "" {
			return errors.New("tool id cannot be empty")
		}
		if _, exists := toolIDs[tool.ID]; exists {
			return fmt.Errorf("duplicate tool id %s", tool.ID)
		}
		toolIDs[tool.ID] = struct{}{}
		if len(tool.Scopes) == 0 {
			return fmt.Errorf("tool %s must define at least one scope", tool.ID)
		}
		if tool.MaxDuration.Duration <= 0 {
			return fmt.Errorf("tool %s must define a positive maxDuration", tool.ID)
		}
	}
	if c.Ledger.Path == "" {
		return errors.New("ledger.path is required")
	}
	if c.Ledger.SecretKey == "" {
		return errors.New("ledger.secretKey is required")
	}
	return nil
}

// Parse consumes a YAML payload and returns the parsed Config.
func Parse(data []byte) (Config, error) {
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return Config{}, err
	}
	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}
