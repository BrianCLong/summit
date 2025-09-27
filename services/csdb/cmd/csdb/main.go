package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/summit-platform/csdb/internal/broker"
	"github.com/summit-platform/csdb/internal/data"
	"github.com/summit-platform/csdb/internal/server"
)

func main() {
	brokerInstance, err := broker.NewBroker(data.ExportFixtures, data.PartnerFixtures)
	if err != nil {
		log.Fatalf("failed to initialise CSDB broker: %v", err)
	}

	srv := server.New(brokerInstance)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	serverAddress := fmt.Sprintf(":%s", port)
	httpServer := &http.Server{
		Addr:              serverAddress,
		Handler:           srv.Router(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("CSDB broker listening on %s", serverAddress)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
