package main

import (
	"flag"
	"log"

	"github.com/summit/transparency/idtl/internal/server"
)

func main() {
	addr := flag.String("addr", ":8080", "address to listen on")
	flag.Parse()

	srv, err := server.New(server.LoadSeedFromEnv())
	if err != nil {
		log.Fatalf("failed to create server: %v", err)
	}
	if err := srv.Start(*addr); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}
