package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"summit/services/pda/internal/engine"
	"summit/services/pda/pkg/api"
)

func main() {
	port := os.Getenv("PDA_HTTP_PORT")
	if port == "" {
		port = "8086"
	}
	falsePositiveTarget := 0.01
	if cfg := os.Getenv("PDA_FALSE_POSITIVE_TARGET"); cfg != "" {
		if v, err := strconv.ParseFloat(cfg, 64); err == nil {
			falsePositiveTarget = v
		}
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	eng := engine.New(engine.Config{
		FalsePositiveTarget: falsePositiveTarget,
		DefaultSuppression:  2 * time.Minute,
		MaxTraces:           1024,
	})

	handler := api.NewHandler(ctx, eng, 64)
	mux := http.NewServeMux()
	handler.Register(mux)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: loggingMiddleware(mux),
	}

	go eng.StartRuleStream(ctx, handler.RuleUpdates)

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	log.Printf("PDA service listening on %s", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}
