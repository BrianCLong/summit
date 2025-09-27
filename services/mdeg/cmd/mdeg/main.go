package main

import (
	"log"
	"os"

	"github.com/summit/mdeg/internal/config"
	"github.com/summit/mdeg/internal/manifest"
	"github.com/summit/mdeg/internal/policy"
	"github.com/summit/mdeg/internal/provider"
	"github.com/summit/mdeg/internal/server"
)

func main() {
	configPath := os.Getenv("MDEG_CONFIG")
	if configPath == "" {
		configPath = "config.yaml"
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	calculator := provider.NewPricingTable(cfg.Providers)
	engine, err := policy.NewEngine(cfg, calculator)
	if err != nil {
		log.Fatalf("failed to build policy engine: %v", err)
	}

	signer, err := manifest.NewSigner(cfg.SigningKey)
	if err != nil {
		log.Fatalf("failed to build signer: %v", err)
	}

	store := manifest.NewStore()
	srv := server.New(engine, signer, store, log.Default())

	addr := cfg.ListenAddr
	if addr == "" {
		addr = ":8080"
	}

	if err := srv.ListenAndServe(addr); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}
