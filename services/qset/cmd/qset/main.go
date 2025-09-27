package main

import (
	"flag"
	"io/ioutil"
	"log"
	"net/http"

	"github.com/summit/qset/internal/config"
	"github.com/summit/qset/internal/ledger"
	"github.com/summit/qset/internal/server"
	"github.com/summit/qset/internal/storage"
)

func main() {
	var configPath string
	var addr string
	flag.StringVar(&configPath, "config", "config.yaml", "Path to QSET YAML config")
	flag.StringVar(&addr, "addr", ":8080", "HTTP listen address")
	flag.Parse()

	cfgBytes, err := ioutil.ReadFile(configPath)
	if err != nil {
		log.Fatalf("failed to read config: %v", err)
	}

	cfg, err := config.Parse(cfgBytes)
	if err != nil {
		log.Fatalf("failed to parse config: %v", err)
	}

	seed, err := ledger.DecodePrivateSeed(cfg.Ledger.SecretKey)
	if err != nil {
		log.Fatalf("invalid ledger secret key: %v", err)
	}

	led, err := ledger.New(cfg.Ledger.Path, seed)
	if err != nil {
		log.Fatalf("failed to bootstrap ledger: %v", err)
	}

	store := storage.NewMemory()
	srv := server.New(cfg, store, led)

	log.Printf("QSET listening on %s (ledger public key: %s)", addr, led.PublicKey())
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
