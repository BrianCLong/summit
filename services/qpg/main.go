package main

import (
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/summit/qpg/internal/config"
	"github.com/summit/qpg/internal/policy"
	"github.com/summit/qpg/internal/server"
	"github.com/summit/qpg/internal/tokenvault"
)

func main() {
	var (
		policyPath string
		vaultPath  string
		addr       string
	)
	flag.StringVar(&policyPath, "policies", "config/policies.yaml", "path to the policy definition file")
	flag.StringVar(&vaultPath, "vault", "config/vault.yaml", "path to the vault share definition file")
	flag.StringVar(&addr, "addr", ":8080", "listen address")
	flag.Parse()

	defs, err := config.LoadPolicies(policyPath)
	if err != nil {
		log.Fatalf("load policies: %v", err)
	}
	policyMgr := policy.NewManager(defs)

	vaultSecret := os.Getenv("QPG_TOKEN_SECRET")
	if vaultSecret == "" {
		vaultSecret = "change-me-qpg-secret"
	}
	vault := tokenvault.NewTokenVault(vaultSecret)

	gateCfg, err := config.LoadVault(vaultPath)
	if err != nil {
		log.Fatalf("load vault config: %v", err)
	}
	gate, err := tokenvault.NewRecoveryGate(*gateCfg)
	if err != nil {
		log.Fatalf("init recovery gate: %v", err)
	}

	srv := server.New(policyMgr, vault, gate)

	log.Printf("QPG listening on %s", addr)
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
