package httpserver

import (
	"encoding/json"
	"fmt"
	stdhttp "net/http"
	"strings"
	"time"

	"example.com/summit/fcs/internal/model"
	"example.com/summit/fcs/internal/service"
)

// Server exposes the FCS service over HTTP.
type Server struct {
	pipeline *service.Pipeline
}

// NewServer builds a server with the required dependencies.
func NewServer(pipeline *service.Pipeline) *Server {
	return &Server{pipeline: pipeline}
}

// Routes exposes the HTTP handler for integration into custom servers.
func (s *Server) Routes() stdhttp.Handler {
	mux := stdhttp.NewServeMux()
	mux.HandleFunc("/seed", s.handleSeed)
	mux.HandleFunc("/detector/scan", s.handleScan)
	mux.HandleFunc("/reports/attribution", s.handleAttribution)
	mux.HandleFunc("/provenance/public-key", s.handlePublicKey)
	mux.HandleFunc("/canaries/", s.handleCanary)
	return mux
}

func (s *Server) handleSeed(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodPost {
		w.WriteHeader(stdhttp.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	var spec model.CanarySpec
	if err := json.NewDecoder(r.Body).Decode(&spec); err != nil {
		httpError(w, stdhttp.StatusBadRequest, "invalid payload: %v", err)
		return
	}
	record, err := s.pipeline.Seed(r.Context(), spec)
	if err != nil {
		httpError(w, stdhttp.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, stdhttp.StatusCreated, record)
}

func (s *Server) handleScan(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodGet {
		w.WriteHeader(stdhttp.StatusMethodNotAllowed)
		return
	}
	detections, err := s.pipeline.Scan(r.Context())
	if err != nil {
		httpError(w, stdhttp.StatusInternalServerError, "detector scan failed: %v", err)
		return
	}
	respondJSON(w, stdhttp.StatusOK, detections)
}

func (s *Server) handleAttribution(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodGet {
		w.WriteHeader(stdhttp.StatusMethodNotAllowed)
		return
	}
	report, err := s.pipeline.BuildAttributionReport(r.Context())
	if err != nil {
		httpError(w, stdhttp.StatusInternalServerError, "build report failed: %v", err)
		return
	}
	respondJSON(w, stdhttp.StatusOK, report)
}

func (s *Server) handlePublicKey(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodGet {
		w.WriteHeader(stdhttp.StatusMethodNotAllowed)
		return
	}
	respondJSON(w, stdhttp.StatusOK, map[string]string{"publicKey": s.pipeline.PublicKeyHex()})
}

func (s *Server) handleCanary(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodGet {
		w.WriteHeader(stdhttp.StatusMethodNotAllowed)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/canaries/")
	if id == "" || strings.Contains(id, "/") {
		httpError(w, stdhttp.StatusBadRequest, "missing canary id")
		return
	}
	record, ok := s.pipeline.Get(r.Context(), id)
	if !ok {
		w.WriteHeader(stdhttp.StatusNotFound)
		return
	}
	respondJSON(w, stdhttp.StatusOK, record)
}

func httpError(w stdhttp.ResponseWriter, status int, format string, args ...any) {
	respondJSON(w, status, map[string]string{"error": fmt.Sprintf(format, args...)})
}

func respondJSON(w stdhttp.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(payload)
}

// ListenAndServe starts the HTTP server on the provided address.
func (s *Server) ListenAndServe(addr string) error {
	server := &stdhttp.Server{
		Addr:              addr,
		Handler:           s.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}
	return server.ListenAndServe()
}
