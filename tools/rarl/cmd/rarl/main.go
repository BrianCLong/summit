package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/summit/rarl/internal/rarl"
	"github.com/summit/rarl/internal/server"
)

type configFile struct {
	Config rarl.Config `json:"config"`
}

func main() {
	var (
		addr       = flag.String("addr", ":8080", "http listen address")
		configPath = flag.String("config", "", "path to configuration json")
	)
	flag.Parse()

	if *configPath == "" {
		log.Fatal("config path required")
	}

	file, err := os.Open(*configPath)
	if err != nil {
		log.Fatalf("unable to open config: %v", err)
	}
	defer file.Close()

	var cfgWrapper configFile
	if err := json.NewDecoder(file).Decode(&cfgWrapper); err != nil {
		log.Fatalf("failed to decode config: %v", err)
	}

	manager, err := rarl.NewManager(cfgWrapper.Config)
	if err != nil {
		log.Fatalf("invalid config: %v", err)
	}

	svc := server.New(manager)
	log.Printf("RARL listening on %s", *addr)
	if err := http.ListenAndServe(*addr, svc.Routes()); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
