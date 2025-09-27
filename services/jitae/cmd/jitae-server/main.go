package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"

	"github.com/summit/jitae/internal/audit"
	"github.com/summit/jitae/internal/clock"
	"github.com/summit/jitae/internal/config"
	"github.com/summit/jitae/internal/core"
	"github.com/summit/jitae/internal/httpapi"
	notify "github.com/summit/jitae/internal/notifier"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	auditor, err := audit.NewManagerFromSecret(cfg.SigningSecret)
	if err != nil {
		log.Fatalf("failed to init audit manager: %v", err)
	}

	var notifier notify.Notifier = notify.Noop{}
	if cfg.WebhookURL != "" {
		notifier = notify.WebhookNotifier{URL: cfg.WebhookURL}
	}

	svc := core.NewService(clock.RealClock{}, auditor, notifier)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go svc.RunExpiryLoop(ctx, cfg.ExpiryScanInterval)

	server := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: httpapi.NewHandler(svc, auditor),
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ExpiryScanInterval)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()

	log.Printf("JITAE server listening on %s", cfg.ListenAddr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
	log.Println("JITAE server stopped")
}
