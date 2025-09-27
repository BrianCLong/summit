package main

import (
	"log"
	"net/http"
	"os"

	"github.com/summit/caff/server"
)

func main() {
	addr := getEnv("CAFF_HTTP_ADDR", ":8080")
	srv := server.New()

	log.Printf("CAFF listening on %s", addr)
	if err := http.ListenAndServe(addr, srv.Router()); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
