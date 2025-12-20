package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Duration wraps time.Duration to support YAML unmarshalling from strings.
type Duration struct {
	time.Duration
}

// UnmarshalYAML parses duration strings such as "30s" or "5m".
func (d *Duration) UnmarshalYAML(value *yaml.Node) error {
	if value == nil {
		return fmt.Errorf("duration value is nil")
	}
	parsed, err := time.ParseDuration(strings.TrimSpace(value.Value))
	if err != nil {
		return fmt.Errorf("invalid duration %q: %w", value.Value, err)
	}
	d.Duration = parsed
	return nil
}

// MarshalYAML renders the duration using time.Duration string representation.
func (d Duration) MarshalYAML() (any, error) {
	return d.Duration.String(), nil
}

// SLOConfig defines service level objectives tracked by the runner.
type SLOConfig struct {
	SuccessRate        float64 `yaml:"successRate" json:"successRate"`
	AlertAfterFailures int     `yaml:"alertAfterFailures" json:"alertAfterFailures"`
}

// ProbeConfig describes an executable governance probe.
type ProbeConfig struct {
	Name            string   `yaml:"name" json:"name"`
	Scenario        string   `yaml:"scenario" json:"scenario"`
	Description     string   `yaml:"description" json:"description"`
	ExpectedOutcome string   `yaml:"expectedOutcome" json:"expectedOutcome"`
	Regions         []string `yaml:"regions" json:"regions"`
}

// SeededCanary toggles deterministic failure injection for a probe.
type SeededCanary struct {
	Enabled     bool   `yaml:"enabled" json:"enabled"`
	FailureMode string `yaml:"failureMode" json:"failureMode"`
	Note        string `yaml:"note" json:"note"`
}

// Config is the root runner configuration loaded from YAML.
type Config struct {
	Profile        string                  `yaml:"profile" json:"profile"`
	LoopInterval   Duration                `yaml:"loopInterval" json:"loopInterval"`
	AlertWindow    Duration                `yaml:"alertWindow" json:"alertWindow"`
	SLO            SLOConfig               `yaml:"slo" json:"slo"`
	Probes         []ProbeConfig           `yaml:"probes" json:"probes"`
	SeededCanaries map[string]SeededCanary `yaml:"seededCanaries" json:"seededCanaries"`
}

// DefaultProfile is the configuration profile used when none is provided.
const DefaultProfile = "production"

// DefaultConfigPath returns the expected location of a config profile relative to root.
func DefaultConfigPath(profile string) string {
	if strings.TrimSpace(profile) == "" {
		profile = DefaultProfile
	}
	filename := fmt.Sprintf("profile.%s.yaml", profile)
	return filepath.Join("config", filename)
}

// Load reads configuration from disk and sets sane defaults.
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config %s: %w", path, err)
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config %s: %w", path, err)
	}
	if cfg.LoopInterval.Duration == 0 {
		cfg.LoopInterval = Duration{Duration: time.Minute}
	}
	if cfg.AlertWindow.Duration == 0 {
		cfg.AlertWindow = Duration{Duration: 5 * time.Minute}
	}
	if cfg.SLO.AlertAfterFailures == 0 {
		cfg.SLO.AlertAfterFailures = 1
	}
	if cfg.SeededCanaries == nil {
		cfg.SeededCanaries = map[string]SeededCanary{}
	}
	return &cfg, nil
}

// ResolveConfigPath computes the actual file path for the provided config or profile.
func ResolveConfigPath(baseDir, explicitPath, profile string) (string, error) {
	if explicitPath != "" {
		if !filepath.IsAbs(explicitPath) {
			return filepath.Join(baseDir, explicitPath), nil
		}
		return explicitPath, nil
	}
	resolved := filepath.Join(baseDir, DefaultConfigPath(profile))
	if _, err := os.Stat(resolved); err != nil {
		return "", fmt.Errorf("config profile %q not found at %s: %w", profile, resolved, err)
	}
	return resolved, nil
}

// CanaryFor returns the seeded canary configuration for a probe, if any.
func (c *Config) CanaryFor(name string) SeededCanary {
	if c == nil || c.SeededCanaries == nil {
		return SeededCanary{}
	}
	return c.SeededCanaries[name]
}
