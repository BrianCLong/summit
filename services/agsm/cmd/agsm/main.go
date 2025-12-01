package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/summit/agsm/internal/config"
	"github.com/summit/agsm/internal/runner"
	"github.com/summit/agsm/internal/storage"
)

func main() {
	var (
		profile       = flag.String("profile", config.DefaultProfile, "configuration profile to load")
		configPath    = flag.String("config", "", "explicit path to configuration file")
		iterations    = flag.Int("iterations", 0, "number of iterations to execute (0 = infinite)")
		once          = flag.Bool("once", false, "run probes a single time and exit")
		exitOnFailure = flag.Bool("exit-on-failure", false, "return non-zero when any probe fails")
		stateDir      = flag.String("state-dir", "state", "directory for persisted metrics output")
		outputPath    = flag.String("output", "", "optional override for metrics output file")
	)
	flag.Parse()

	if *once {
		*iterations = 1
	}

	baseDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("determine working directory: %v", err)
	}

	resolvedConfig, err := config.ResolveConfigPath(baseDir, *configPath, *profile)
	if err != nil {
		log.Fatalf("resolve config: %v", err)
	}

	cfg, err := config.Load(resolvedConfig)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	statePath := *outputPath
	if statePath == "" {
		statePath = filepath.Join(filepath.Dir(resolvedConfig), "..", *stateDir, "metrics.json")
	}
	statePath = filepath.Clean(statePath)

	store := storage.NewFileStorage(statePath)
	run := runner.New(cfg, store)

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	iteration := 0
	for {
		if *iterations > 0 && iteration >= *iterations {
			break
		}
		iteration++

		report, err := run.RunIteration(ctx)
		if err != nil {
			log.Fatalf("probe iteration failed: %v", err)
		}

		for _, result := range report.Results {
			status := "PASS"
			if !result.Success {
				status = "FAIL"
			}
			log.Printf("[%s] %s (%s) latency=%dms", status, result.Name, result.Scenario, result.LatencyMs)
			if result.Error != "" {
				log.Printf("  reason: %s", result.Error)
			}
		}
		for _, alert := range report.Alerts {
			log.Printf("ALERT [%s] %s", alert.Level, alert.Message)
		}

		if *exitOnFailure && report.HasFailures() {
			log.Fatalf("probe failures detected and exit-on-failure enabled")
		}

		if *iterations > 0 && iteration >= *iterations {
			break
		}

		select {
		case <-ctx.Done():
			log.Println("received shutdown signal")
			return
		case <-time.After(cfg.LoopInterval.Duration):
		}
	}

	fmt.Println("agsm runner completed")
}
