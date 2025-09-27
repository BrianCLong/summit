package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/summit/gcm/internal/httpapi"
	"github.com/summit/gcm/internal/service"
	"github.com/summit/gcm/internal/signature"
)

func main() {
	cfgPath := os.Getenv("GCM_POLICY_CONFIG")
	cfg, err := service.LoadConfig(cfgPath)
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	tolerance := 0.02
	if rawTol := os.Getenv("GCM_RECON_TOLERANCE"); rawTol != "" {
		if parsed, err := strconv.ParseFloat(rawTol, 64); err == nil && parsed >= 0 {
			tolerance = parsed
		}
	}

	signer := signature.NewSigner(os.Getenv("GCM_SIGNING_SECRET"))
	store := service.NewMemoryStore()
	ledger := service.NewBudgetLedger()
	svc := service.NewService(cfg, store, ledger, signer, tolerance)

	server := httpapi.New(svc)
	addr := os.Getenv("GO_HTTP_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           server.Router(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}

	log.Printf("GCM metering service listening on %s", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
