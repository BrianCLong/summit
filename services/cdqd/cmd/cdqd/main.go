package main

import (
	"flag"
	"log"
	"net/http"
	"time"

	"summit/services/cdqd/internal/api"
	"summit/services/cdqd/internal/core"
)

func main() {
	addr := flag.String("addr", ":8080", "address to bind the HTTP server")
	flag.Parse()

	store := core.NewStore()
	server := api.NewServer(store)

	srv := &http.Server{
		Addr:              *addr,
		Handler:           server.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
	}

	log.Printf("CDQD service listening on %s", *addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server exited: %v", err)
	}
}
