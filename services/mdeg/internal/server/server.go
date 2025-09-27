package server

import (
	"log"
	"net/http"

	"github.com/summit/mdeg/internal/manifest"
	"github.com/summit/mdeg/internal/policy"
)

// Server exposes the HTTP API for the MDEG sidecar.
type Server struct {
	engine *policy.Engine
	signer *manifest.Signer
	store  *manifest.Store
	logger *log.Logger
}

// New constructs a server with its dependencies wired in.
func New(engine *policy.Engine, signer *manifest.Signer, store *manifest.Store, logger *log.Logger) *Server {
	if logger == nil {
		logger = log.New(log.Writer(), "mdeg", log.LstdFlags)
	}
	return &Server{
		engine: engine,
		signer: signer,
		store:  store,
		logger: logger,
	}
}

// Handler returns the configured HTTP handler.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.handleHealth)
	mux.HandleFunc("/transfers", s.handleTransfer)
	mux.HandleFunc("/manifests/", s.handleManifest)
	mux.HandleFunc("/policies", s.handlePolicies)
	return mux
}

// ListenAndServe starts the HTTP server.
func (s *Server) ListenAndServe(addr string) error {
	s.logger.Printf("listening on %s", addr)
	return http.ListenAndServe(addr, s.Handler())
}
