package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/summit/osrp/internal/plan"
)

func main() {
	var configPath string
	var fixturePath string
	flag.StringVar(&configPath, "config", "services/osrp/config/default.json", "planner configuration file")
	flag.StringVar(&fixturePath, "fixture", "", "rollout fixture to evaluate")
	flag.Parse()

	if fixturePath == "" {
		log.Fatal("fixture path is required")
	}

	config, err := loadConfig(configPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	signer, err := plan.NewManifestSignerFromFile(config.SigningKeyPath)
	if err != nil {
		log.Fatalf("load signer: %v", err)
	}

	planner, err := plan.NewPlanner(config, signer)
	if err != nil {
		log.Fatalf("init planner: %v", err)
	}

	fixture, err := loadFixture(fixturePath)
	if err != nil {
		log.Fatalf("load fixture: %v", err)
	}

	result, err := planner.Plan(fixture)
	if err != nil {
		log.Fatalf("plan: %v", err)
	}

	output, err := json.MarshalIndent(result.Manifest, "", "  ")
	if err != nil {
		log.Fatalf("encode manifest: %v", err)
	}

	fmt.Println(string(output))

	if len(result.Breaches) > 0 {
		log.Printf("auto-revert triggered: %s", result.Manifest.AutoRevert.Reason)
	} else {
		log.Printf("rollout approved across %d stages", len(result.Manifest.Stages))
	}
}

func loadConfig(path string) (plan.PlannerConfig, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return plan.PlannerConfig{}, err
	}
	var cfg plan.PlannerConfig
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return plan.PlannerConfig{}, err
	}
	if cfg.SigningKeyPath != "" && !filepath.IsAbs(cfg.SigningKeyPath) {
		cfg.SigningKeyPath = filepath.Join(filepath.Dir(path), cfg.SigningKeyPath)
	}
	return cfg, nil
}

func loadFixture(path string) (plan.RolloutFixture, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return plan.RolloutFixture{}, err
	}
	var fx plan.RolloutFixture
	if err := json.Unmarshal(raw, &fx); err != nil {
		return plan.RolloutFixture{}, err
	}
	return fx, nil
}
