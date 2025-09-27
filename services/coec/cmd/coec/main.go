package main

import (
	"log"
	"net/http"
	"os"

	"github.com/summit-hq/coec/internal/server"
	"github.com/summit-hq/coec/internal/service"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	manager := service.NewManager()
	httpServer := server.New(manager)
	addr := ":" + port

	log.Printf("COEC service listening on %s", addr)
	if err := http.ListenAndServe(addr, httpServer.Routes()); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
