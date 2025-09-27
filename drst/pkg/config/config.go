package config

import (
	"fmt"
	"io"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Seed          int64           `yaml:"seed" json:"seed"`
	Jurisdictions []Jurisdiction  `yaml:"jurisdictions" json:"jurisdictions"`
	Observations  Observations    `yaml:"observations" json:"observations"`
	StorageScans  []StorageTarget `yaml:"storageScans" json:"storageScans"`
}

type Jurisdiction struct {
	Name             string             `yaml:"name" json:"name"`
	TransactionCount int                `yaml:"transactionCount" json:"transactionCount"`
	Tags             map[string]string  `yaml:"tags" json:"tags"`
	Routes           []RouteExpectation `yaml:"routes" json:"routes"`
}

type RouteExpectation struct {
	Endpoint         string   `yaml:"endpoint" json:"endpoint"`
	AllowedRegions   []string `yaml:"allowedRegions" json:"allowedRegions"`
	RequiredEdgeHops []string `yaml:"requiredEdgeHops" json:"requiredEdgeHops"`
}

type Observations struct {
	RouteLogsPath   string `yaml:"routeLogsPath" json:"routeLogsPath"`
	StorageLogsPath string `yaml:"storageLogsPath" json:"storageLogsPath"`
}

type StorageTarget struct {
	Bucket         string   `yaml:"bucket" json:"bucket"`
	Path           string   `yaml:"path" json:"path"`
	AllowedRegions []string `yaml:"allowedRegions" json:"allowedRegions"`
}

func Load(r io.Reader) (*Config, error) {
	var cfg Config
	dec := yaml.NewDecoder(r)
	dec.KnownFields(true)
	if err := dec.Decode(&cfg); err != nil {
		return nil, fmt.Errorf("decode config: %w", err)
	}
	if cfg.Seed == 0 {
		cfg.Seed = 1
	}
	return &cfg, nil
}
