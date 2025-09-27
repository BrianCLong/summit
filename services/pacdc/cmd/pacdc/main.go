package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/summit/pacdc/pkg/config"
	"github.com/summit/pacdc/pkg/policy"
	"github.com/summit/pacdc/pkg/replicator"
	"github.com/summit/pacdc/pkg/source"
	"github.com/summit/pacdc/pkg/target"
	"github.com/summit/pacdc/pkg/tooling"
)

func main() {
	var cfgPath string
	var command string
	var positionsPath string
	flag.StringVar(&cfgPath, "config", "", "Path to replication config (JSON)")
	flag.StringVar(&command, "command", "backfill", "Operation to run: backfill|cutover|snapshot|changes")
	flag.StringVar(&positionsPath, "positions", "", "Path to JSON file containing stream positions for cutover")
	flag.Parse()

	if cfgPath == "" {
		fatal(errors.New("config path is required"))
	}

	cfg, err := loadConfig(cfgPath)
	if err != nil {
		fatal(err)
	}

	src := source.NewPostgresSource(cfg.Source)
	targets, err := buildTargets(cfg)
	if err != nil {
		fatal(err)
	}
	engine := policy.NewEngine(cfg.Policies)
	rep, err := replicator.New(cfg, src, targets, engine)
	if err != nil {
		fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	switch command {
	case "backfill":
		result, err := tooling.Backfill(ctx, rep)
		if err != nil {
			fatal(err)
		}
		outputJSON(result)
	case "cutover":
		if positionsPath == "" {
			fatal(errors.New("positions path required for cutover"))
		}
		positions, err := loadPositions(positionsPath)
		if err != nil {
			fatal(err)
		}
		manifest, err := tooling.Cutover(ctx, rep, positions)
		if err != nil {
			fatal(err)
		}
		outputJSON(manifest)
	case "snapshot":
		if err := rep.RunSnapshot(ctx); err != nil {
			fatal(err)
		}
		outputJSON(rep.Manifest())
	case "changes":
		if err := rep.RunChanges(ctx, nil); err != nil {
			fatal(err)
		}
		outputJSON(rep.Manifest())
	default:
		fatal(fmt.Errorf("unknown command %s", command))
	}
}

func buildTargets(cfg config.Config) ([]replicator.Target, error) {
	targets := make([]replicator.Target, 0, len(cfg.Targets))
	for _, tcfg := range cfg.Targets {
		switch tcfg.Type {
		case "s3":
			if tcfg.S3 == nil {
				return nil, fmt.Errorf("s3 target missing configuration")
			}
			targets = append(targets, target.NewS3Target(*tcfg.S3))
		case "bigquery":
			if tcfg.BigQuery == nil {
				return nil, fmt.Errorf("bigquery target missing configuration")
			}
			targets = append(targets, target.NewBigQueryTarget(*tcfg.BigQuery))
		default:
			return nil, fmt.Errorf("unknown target type %s", tcfg.Type)
		}
	}
	return targets, nil
}

func loadConfig(path string) (config.Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return config.Config{}, err
	}
	var cfg config.Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return config.Config{}, err
	}
	return cfg, nil
}

func loadPositions(path string) (map[string]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	positions := map[string]string{}
	if len(data) == 0 {
		return positions, nil
	}
	if err := json.Unmarshal(data, &positions); err != nil {
		return nil, err
	}
	return positions, nil
}

func outputJSON(v any) {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		fatal(err)
	}
	fmt.Println(string(data))
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "error:", err)
	os.Exit(1)
}
