package main

import (
	"log"
	"net/http"
	"os"

	"github.com/summit/ccmo/internal/ccmo"
)

func main() {
	service, err := ccmo.NewService(ccmo.RealClock{})
	if err != nil {
		log.Fatalf("unable to start CCMO service: %v", err)
	}
	server := ccmo.NewServer(service)

	mux := http.NewServeMux()
	server.Routes(mux)

	addr := ":8080"
	if fromEnv := os.Getenv("CCMO_ADDR"); fromEnv != "" {
		addr = fromEnv
	}

	log.Printf("CCMO listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
