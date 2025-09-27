package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

// Config captures the runtime parameters for the MDEG sidecar.
type Config struct {
	ListenAddr string                    `yaml:"listenAddr"`
	SigningKey string                    `yaml:"signingKey"`
	Providers  map[string]ProviderConfig `yaml:"providers"`
	Policies   []PolicyConfig            `yaml:"policies"`
}

// ProviderConfig sets the billing metadata for a storage provider.
type ProviderConfig struct {
	Name        string  `yaml:"name"`
	PricePerGiB float64 `yaml:"pricePerGiB"`
}

// PolicyConfig describes a single egress governance policy.
type PolicyConfig struct {
	ID            string            `yaml:"id"`
	Description   string            `yaml:"description"`
	DataClasses   []string          `yaml:"dataClasses"`
	Destinations  []DestinationRule `yaml:"destinations"`
	MaxBytes      int64             `yaml:"maxBytes"`
	MaxCost       float64           `yaml:"maxCost"`
	RateLimit     RateLimitConfig   `yaml:"rateLimit"`
	WindowSeconds int64             `yaml:"windowSeconds"`
	Tags          map[string]string `yaml:"tags"`
}

// DestinationRule restricts which external targets can receive data.
type DestinationRule struct {
	Provider string `yaml:"provider"`
	Bucket   string `yaml:"bucket"`
	Region   string `yaml:"region"`
}

// RateLimitConfig represents the throughput ceiling for a policy.
type RateLimitConfig struct {
	BytesPerSecond int64 `yaml:"bytesPerSecond"`
	BurstBytes     int64 `yaml:"burstBytes"`
}

// DefaultWindow returns the default accounting window for a policy.
func (p PolicyConfig) DefaultWindow() time.Duration {
	if p.WindowSeconds <= 0 {
		return 24 * time.Hour
	}
	return time.Duration(p.WindowSeconds) * time.Second
}

// Load reads a YAML configuration file from disk.
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	if cfg.SigningKey == "" {
		return nil, fmt.Errorf("signingKey must be provided")
	}

	if len(cfg.Policies) == 0 {
		return nil, fmt.Errorf("at least one policy must be defined")
	}

	return &cfg, nil
}
