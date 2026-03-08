//go:build integration
// +build integration

package pgstore_test

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/ory/dockertest/v3"
	"github.com/ory/dockertest/v3/docker"

	"github.com/summit/orchestration/runtime/internal/state/pgstore"
)

func TestCreateRunIdempotency(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Read migration file from disk (go:embed doesn't support relative paths with ..)
	migrationContent, err := os.ReadFile("../../../../deploy/sql/20260131_0001_create_orchestrator_tables.up.sql")
	if err != nil {
		t.Fatalf("failed to read migration file: %v", err)
	}
	migrationSQL := string(migrationContent)

	ctx := context.Background()
	pool, err := dockertest.NewPool("")
	if err != nil {
		t.Fatalf("could not connect to docker: %v", err)
	}

	resource, err := pool.RunWithOptions(&dockertest.RunOptions{
		Repository: "postgres",
		Tag:        "15",
		Env: []string{
			"POSTGRES_PASSWORD=secret",
			"POSTGRES_DB=postgres",
		},
	}, func(hostConfig *docker.HostConfig) {
		hostConfig.AutoRemove = true
		hostConfig.RestartPolicy = docker.RestartPolicy{Name: "no"}
	})
	if err != nil {
		t.Fatalf("could not start resource: %v", err)
	}
	defer func() {
		_ = pool.Purge(resource)
	}()

	var db *sql.DB
	// exponential backoff-retry for postgres to be ready
	if err := pool.Retry(func() error {
		var err error
		port := resource.GetPort("5432/tcp")
		dsn := fmt.Sprintf("postgres://postgres:secret@localhost:%s/postgres?sslmode=disable", port)
		db, err = sql.Open("pgx", dsn)
		if err != nil {
			return err
		}
		return db.Ping()
	}); err != nil {
		t.Fatalf("could not connect to dockerized postgres: %v", err)
	}
	defer db.Close()

	// Apply migration SQL (split on semicolons and execute)
	parts := strings.Split(migrationSQL, ";")
	for _, part := range parts {
		stmt := strings.TrimSpace(part)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("migration exec error: %v\nstmt: %s", err, stmt)
		}
	}

	port := resource.GetPort("5432/tcp")
	dsn := fmt.Sprintf("postgres://postgres:secret@localhost:%s/postgres?sslmode=disable", port)

	store, err := pgstore.New(ctx, dsn)
	if err != nil {
		t.Fatalf("pgstore.New: %v", err)
	}
	defer store.Close()

	// Create run twice with same idempotency key
	r1, err := store.CreateRun(ctx, "client-1", "tester", map[string]any{"a": 1})
	if err != nil {
		t.Fatalf("CreateRun1: %v", err)
	}
	r2, err := store.CreateRun(ctx, "client-1", "tester", map[string]any{"a": 1})
	if err != nil {
		t.Fatalf("CreateRun2: %v", err)
	}
	if r1.ID != r2.ID {
		t.Fatalf("expected same run id for idempotent calls; got %s and %s", r1.ID, r2.ID)
	}

	// Validate DB single row
	var count int
	if err := db.QueryRow("SELECT count(*) FROM orchestrator_runs WHERE idempotency_key = $1", "client-1").Scan(&count); err != nil {
		t.Fatalf("count query failed: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 run with idempotency_key client-1, got %d", count)
	}
}
