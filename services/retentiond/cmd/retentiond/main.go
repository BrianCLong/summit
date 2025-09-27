package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/spf13/cobra"

	"github.com/summit/services/retentiond/internal/backfill"
	"github.com/summit/services/retentiond/internal/config"
	"github.com/summit/services/retentiond/internal/engine"
	"github.com/summit/services/retentiond/internal/receipts"
	"github.com/summit/services/retentiond/internal/storage"
)

var (
	cfgPath  string
	dryRun   bool
	once     bool
	httpAddr string
)

func main() {
	root := &cobra.Command{
		Use:   "retentiond",
		Short: "Retention policy enforcer",
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			if cfgPath == "" {
				return fmt.Errorf("--config is required")
			}
			return nil
		},
	}

	root.PersistentFlags().StringVar(&cfgPath, "config", "", "path to retentiond config")
	root.PersistentFlags().BoolVar(&dryRun, "dry-run", false, "simulate deletions without mutating storage")
	root.PersistentFlags().BoolVar(&once, "once", false, "run one sweep and exit")
	root.PersistentFlags().StringVar(&httpAddr, "http", ":8088", "address for metrics server")

	root.AddCommand(newServeCmd())
	root.AddCommand(newBackfillCmd())

	if err := root.Execute(); err != nil {
		log.Fatal(err)
	}
}

func newServeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Run the retention daemon",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx, cancel := signal.NotifyContext(cmd.Context(), syscall.SIGINT, syscall.SIGTERM)
			defer cancel()
			cfg, err := config.Load(cfgPath)
			if err != nil {
				return err
			}
			if dryRun {
				cfg.DryRun = true
			}
			eng, state, err := buildEngine(ctx, cfg)
			if err != nil {
				return err
			}
			eng.DryRun = cfg.DryRun

			mux := http.NewServeMux()
			mux.HandleFunc("/metrics/runs", state.handleRuns)
			mux.HandleFunc("/metrics/kpis", state.handleKPIs)

			srv := &http.Server{Addr: httpAddr, Handler: mux}
			go func() {
				if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					log.Printf("metrics server error: %v", err)
				}
			}()

			ticker := time.NewTicker(cfg.Interval)
			defer ticker.Stop()

			runOnce := func() error {
				results, err := eng.Run(ctx, *cfg, time.Now().UTC())
				if err != nil {
					return err
				}
				state.update(results)
				for _, res := range results {
					if res.DryRun {
						log.Printf("[dry-run] policy=%s expired=%d", res.Policy, countExpired(res))
					} else {
						log.Printf("policy=%s deleted=%d receipt=%s", res.Policy, countExpired(res), res.ReceiptPath)
					}
				}
				return nil
			}

			if err := runOnce(); err != nil {
				return err
			}
			if once {
				shutdownContext, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancelShutdown()
				return srv.Shutdown(shutdownContext)
			}

			for {
				select {
				case <-ctx.Done():
					shutdownContext, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
					defer cancelShutdown()
					return srv.Shutdown(shutdownContext)
				case <-ticker.C:
					if err := runOnce(); err != nil {
						log.Printf("sweep error: %v", err)
					}
				}
			}
		},
	}
}

func newBackfillCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "backfill",
		Short: "Run the dry-run backfill scanner",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load(cfgPath)
			if err != nil {
				return err
			}
			ctx := cmd.Context()
			eng, _, err := buildEngine(ctx, cfg)
			if err != nil {
				return err
			}
			scanner := backfill.Scanner{Engine: eng}
			results, err := scanner.Scan(ctx, *cfg, time.Now().UTC())
			if err != nil {
				return err
			}
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			return enc.Encode(results)
		},
	}
}

type resultState struct {
	mu      sync.RWMutex
	results []engine.Result
}

func (r *resultState) update(results []engine.Result) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.results = results
}

func (r *resultState) snapshot() []engine.Result {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]engine.Result, len(r.results))
	copy(out, r.results)
	return out
}

func (r *resultState) handleRuns(w http.ResponseWriter, req *http.Request) {
	runs := r.snapshot()
	payload := map[string]any{
		"generatedAt": time.Now().UTC(),
		"runs":        runs,
	}
	writeJSON(w, payload)
}

func (r *resultState) handleKPIs(w http.ResponseWriter, req *http.Request) {
	runs := r.snapshot()
	type policyKPI struct {
		Policy       string    `json:"policy"`
		DeletedItems int       `json:"deletedItems"`
		ExpiredItems int       `json:"expiredItems"`
		Cutoff       time.Time `json:"cutoff"`
		DryRun       bool      `json:"dryRun"`
		Targets      []any     `json:"targets"`
	}
	kpis := make([]policyKPI, 0, len(runs))
	for _, run := range runs {
		expired := countExpired(run)
		targets := make([]any, len(run.Targets))
		for i, target := range run.Targets {
			targets[i] = map[string]any{
				"type":       target.Type,
				"identifier": target.Identifier,
				"expired":    len(target.Expired),
				"deleted":    target.DeletedCount,
			}
		}
		kpis = append(kpis, policyKPI{
			Policy:       run.Policy,
			DeletedItems: expired,
			ExpiredItems: expired,
			Cutoff:       run.Cutoff,
			DryRun:       run.DryRun,
			Targets:      targets,
		})
	}
	writeJSON(w, map[string]any{"policies": kpis})
}

func writeJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func countExpired(result engine.Result) int {
	total := 0
	for _, target := range result.Targets {
		total += len(target.Expired)
	}
	return total
}

func buildEngine(ctx context.Context, cfg *config.Config) (*engine.Engine, *resultState, error) {
	var objectStore storage.ObjectStore
	if cfg.Storage.ManifestDir != "" {
		objectStore = storage.NewManifestStore(cfg.Storage.ManifestDir)
	} else if cfg.Storage.S3 != nil {
		awsCfg, err := loadAWSConfig(ctx, *cfg.Storage.S3)
		if err != nil {
			return nil, nil, err
		}
		client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
			if cfg.Storage.S3.ForcePathStyle {
				o.UsePathStyle = true
			}
		})
		objectStore = storage.NewS3Store(client)
	}

	var db storage.Database
	if cfg.Storage.Postgres != nil && cfg.Storage.Postgres.URL != "" {
		pool, err := pgxpool.New(ctx, cfg.Storage.Postgres.URL)
		if err != nil {
			return nil, nil, fmt.Errorf("connect postgres: %w", err)
		}
		db = storage.NewPostgresStore(pool)
	}

	receiptWriter := receipts.NewFileWriter(cfg.Receipts.Directory)

	eng := &engine.Engine{
		ObjectStore: objectStore,
		Database:    db,
		Receipts:    receiptWriter,
		DryRun:      cfg.DryRun,
	}

	state := &resultState{}
	return eng, state, nil
}

func loadAWSConfig(ctx context.Context, cfg config.S3Config) (aws.Config, error) {
	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.Region),
	}
	if cfg.Endpoint != "" {
		resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:           cfg.Endpoint,
				SigningRegion: cfg.Region,
			}, nil
		})
		opts = append(opts, awsconfig.WithEndpointResolverWithOptions(resolver))
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return aws.Config{}, fmt.Errorf("load aws config: %w", err)
	}
	return awsCfg, nil
}

// ensure we reference s3 manager to keep module tidy (used by lifecycle operations).
var _ = manager.NewUploader
var _ s3types.Object
