package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"pcbo/internal/api"
)

func main() {
	port := flag.Int("port", 8080, "port to listen on")
	flag.Parse()

	server := api.NewServer()
	addr := fmt.Sprintf(":%d", *port)
	log.Printf("pcbo orchestrator listening on %s", addr)
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
