package server

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/summit-platform/csdb/internal/broker"
)

type Server struct {
	broker *broker.Broker
}

func New(b *broker.Broker) *Server {
	return &Server{broker: b}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Post("/exports", s.handleCreateExport)
	r.Post("/exports/preview", s.handlePreviewExport)
	r.Get("/manifests/{id}", s.handleGetManifest)
	r.Post("/attestations/verify", s.handleVerifyAttestation)

	return r
}

func (s *Server) handleCreateExport(w http.ResponseWriter, r *http.Request) {
	var req broker.ExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid export request payload")
		return
	}

	result, err := s.broker.CreateExport(r.Context(), req)
	if err != nil {
		status := http.StatusBadRequest
		if err == broker.ErrUnknownPartner {
			status = http.StatusNotFound
		}
		respondError(w, status, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, result)
}

func (s *Server) handlePreviewExport(w http.ResponseWriter, r *http.Request) {
	var req broker.ExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid export request payload")
		return
	}

	result, err := s.broker.PreviewExport(r.Context(), req)
	if err != nil {
		status := http.StatusBadRequest
		if err == broker.ErrUnknownPartner {
			status = http.StatusNotFound
		}
		respondError(w, status, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, result)
}

func (s *Server) handleGetManifest(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	manifest, ok := s.broker.GetManifest(id)
	if !ok {
		respondError(w, http.StatusNotFound, "manifest not found")
		return
	}

	respondJSON(w, http.StatusOK, manifest)
}

func (s *Server) handleVerifyAttestation(w http.ResponseWriter, r *http.Request) {
	var att broker.Attestation
	if err := json.NewDecoder(r.Body).Decode(&att); err != nil {
		respondError(w, http.StatusBadRequest, "invalid attestation payload")
		return
	}
	result := s.broker.ValidateAttestation(att)
	status := http.StatusOK
	if !result.Valid {
		status = http.StatusUnprocessableEntity
	}
	respondJSON(w, status, result)
}

func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
