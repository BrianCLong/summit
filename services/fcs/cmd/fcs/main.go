package main

import (
	"flag"
	"log"

	"example.com/summit/fcs/internal/httpserver"
	"example.com/summit/fcs/internal/model"
	"example.com/summit/fcs/internal/provenance"
	"example.com/summit/fcs/internal/service"
	"example.com/summit/fcs/internal/store"
)

func main() {
	addr := flag.String("addr", ":8080", "address for the FCS HTTP server")
	flag.Parse()

	provManager, err := provenance.NewRandomManager()
	if err != nil {
		log.Fatalf("failed to initialise provenance manager: %v", err)
	}

	stores := map[model.StoreKind]store.Store{
		model.StoreDatabase: store.NewMemoryStore(model.StoreDatabase),
		model.StoreObject:   store.NewMemoryStore(model.StoreObject),
		model.StoreSearch:   store.NewMemoryStore(model.StoreSearch),
		model.StoreVector:   store.NewMemoryStore(model.StoreVector),
	}

	pipeline, err := service.NewPipeline(stores, provManager)
	if err != nil {
		log.Fatalf("failed to initialise pipeline: %v", err)
	}

	server := httpserver.NewServer(pipeline)

	log.Printf("FCS server starting on %s", *addr)
	if err := server.ListenAndServe(*addr); err != nil {
		log.Printf("server stopped: %v", err)
	}
}
