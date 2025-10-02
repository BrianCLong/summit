package main

import (
	"flag"
	"log"

	"github.com/summit/acc/internal/config"
	"github.com/summit/acc/internal/server"
)

func main() {
	configPath := flag.String("config", "./config/policies.yaml", "path to policy config")
	addr := flag.String("addr", ":8088", "listen address")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	if err := server.ListenAndServe(*addr, cfg); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
