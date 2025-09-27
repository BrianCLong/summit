package config

import (
	"fmt"
	"os"
	"time"
)

// Config captures runtime configuration for the JITAE service.
type Config struct {
	ListenAddr         string
	SigningSecret      string
	WebhookURL         string
	ExpiryScanInterval time.Duration
}

// Load reads configuration from environment variables.
func Load() (Config, error) {
	cfg := Config{
		ListenAddr:         getEnv("JITAE_LISTEN_ADDR", ":8080"),
		SigningSecret:      os.Getenv("JITAE_SIGNING_SECRET"),
		WebhookURL:         os.Getenv("JITAE_WEBHOOK_URL"),
		ExpiryScanInterval: time.Second * 5,
	}

	if v := os.Getenv("JITAE_EXPIRY_SCAN_INTERVAL"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("invalid JITAE_EXPIRY_SCAN_INTERVAL: %w", err)
		}
		cfg.ExpiryScanInterval = d
	}

	if cfg.SigningSecret == "" {
		return Config{}, fmt.Errorf("JITAE_SIGNING_SECRET must be provided")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
