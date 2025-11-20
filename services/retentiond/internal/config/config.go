package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

// Config is the root configuration for retentiond.
type Config struct {
	Interval time.Duration `yaml:"interval"`
	DryRun   bool          `yaml:"dryRun"`

	Storage  StorageConfig `yaml:"storage"`
	Receipts ReceiptConfig `yaml:"receipts"`
	Policies []Policy      `yaml:"policies"`
}

// StorageConfig contains connection details for backing services.
type StorageConfig struct {
	S3          *S3Config       `yaml:"s3"`
	Postgres    *PostgresConfig `yaml:"postgres"`
	ManifestDir string          `yaml:"manifestDir"`
}

// S3Config encapsulates AWS configuration parameters.
type S3Config struct {
	Region          string                    `yaml:"region"`
	Endpoint        string                    `yaml:"endpoint"`
	ForcePathStyle  bool                      `yaml:"forcePathStyle"`
	BucketOverrides map[string]BucketOverride `yaml:"bucketOverrides"`
}

// BucketOverride allows per-bucket configuration tweaks used when applying
// lifecycle rules.
type BucketOverride struct {
	LifecyclePrefix string `yaml:"lifecyclePrefix"`
}

// PostgresConfig holds the connection URL to the database.
type PostgresConfig struct {
	URL string `yaml:"url"`
}

// ReceiptConfig controls how receipts are persisted.
type ReceiptConfig struct {
	Directory string `yaml:"directory"`
}

// Policy defines a TTL for one or more targets.
type Policy struct {
	Name        string        `yaml:"name"`
	Description string        `yaml:"description"`
	RetainFor   time.Duration `yaml:"retainFor"`
	Targets     []Target      `yaml:"targets"`
}

// Target describes a Postgres table or S3 prefix to enforce TTLs on.
type Target struct {
	Type string `yaml:"type"`

	// S3-specific fields
	Bucket string `yaml:"bucket"`
	Prefix string `yaml:"prefix"`
	Tag    string `yaml:"tag"`

	// Postgres-specific fields
	Table           string   `yaml:"table"`
	TimestampColumn string   `yaml:"timestampColumn"`
	KeyColumns      []string `yaml:"keyColumns"`
	Filter          string   `yaml:"filter"`
}

// Load reads a YAML file from disk and unmarshals it into Config.
func Load(path string) (*Config, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(raw, &cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func (c *Config) validate() error {
	if c.Interval == 0 {
		c.Interval = 6 * time.Hour
	}
	if c.Receipts.Directory == "" {
		return fmt.Errorf("receipts.directory is required")
	}

	for i := range c.Policies {
		if err := c.Policies[i].validate(); err != nil {
			return fmt.Errorf("policy %q invalid: %w", c.Policies[i].Name, err)
		}
	}

	return nil
}

func (p *Policy) validate() error {
	if p.Name == "" {
		return fmt.Errorf("name is required")
	}
	if p.RetainFor <= 0 {
		return fmt.Errorf("retainFor must be positive duration")
	}
	if len(p.Targets) == 0 {
		return fmt.Errorf("at least one target must be defined")
	}
	for i := range p.Targets {
		if err := p.Targets[i].validate(); err != nil {
			return fmt.Errorf("target %d invalid: %w", i, err)
		}
	}
	return nil
}

func (t *Target) validate() error {
	switch t.Type {
	case "s3":
		if t.Bucket == "" {
			return fmt.Errorf("bucket is required for s3 target")
		}
	case "postgres":
		if t.Table == "" || t.TimestampColumn == "" {
			return fmt.Errorf("table and timestampColumn required for postgres target")
		}
		if len(t.KeyColumns) == 0 {
			return fmt.Errorf("keyColumns must be provided for postgres target")
		}
	default:
		return fmt.Errorf("unsupported target type %q", t.Type)
	}
	return nil
}

// CompileTimestamp returns the cutoff time for data retention evaluation.
func (p Policy) CompileTimestamp(ref time.Time) time.Time {
	return ref.Add(-p.RetainFor)
}
