package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/summit/orchestration/runtime/internal/engine"
	"github.com/summit/orchestration/runtime/internal/model"
	"github.com/summit/orchestration/runtime/internal/state"
	"github.com/summit/orchestration/runtime/internal/telemetry"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	tracerProvider, shutdown := telemetry.InitProvider("chronosd")
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			log.Printf("otel shutdown: %v", err)
		}
	}()

	dsn := os.Getenv("PG_DSN")
	store, err := state.OpenPostgres(ctx, dsn)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer store.Close()

	executor := engine.NewExecutor(store)

	mux := http.NewServeMux()
	mux.HandleFunc("/v1/start", func(w http.ResponseWriter, r *http.Request) {
		var req model.StartRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		runID, err := executor.Start(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"runId": runID})
	})

	mux.HandleFunc("/v1/status/", func(w http.ResponseWriter, r *http.Request) {
		runID := r.URL.Path[len("/v1/status/"):]
		status, err := executor.Status(r.Context(), runID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		_ = json.NewEncoder(w).Encode(status)
	})

	srv := &http.Server{
		Addr:    ":8080",
		Handler: telemetry.HTTPMiddleware(mux, tracerProvider),
	}

	go func() {
		log.Printf("chronosd listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("http shutdown: %v", err)
	}
}
