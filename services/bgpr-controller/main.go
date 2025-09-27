package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/summit/bgpr/controller"
	"github.com/summit/bgpr/httpapi"
)

func main() {
	var port int
	var initialPolicy string
	flag.IntVar(&port, "port", 8085, "port to listen on")
	flag.StringVar(&initialPolicy, "policy", "policy-v1", "initial active policy version")
	flag.Parse()

	secret := os.Getenv("BGPR_MANIFEST_SECRET")
	if secret == "" {
		log.Fatal("BGPR_MANIFEST_SECRET must be set")
	}

	ctrl, err := controller.NewController(initialPolicy, secret)
	if err != nil {
		log.Fatalf("failed to create controller: %v", err)
	}

	mux := http.NewServeMux()
	api := httpapi.New(ctrl)
	api.Register(mux)

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", port),
		Handler:           mux,
		ReadTimeout:       5 * time.Second,
		WriteTimeout:      10 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("bgpr controller listening on %s (policy=%s)", srv.Addr, initialPolicy)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
