package server

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/summit/mdeg/internal/manifest"
	"github.com/summit/mdeg/internal/policy"
)

type errorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}

type transferResponse struct {
	Allowed  bool             `json:"allowed"`
	Manifest *manifest.Record `json:"manifest,omitempty"`
	Reason   string           `json:"reason,omitempty"`
	Window   time.Time        `json:"windowEnd"`
}

type reconcileRequest struct {
	ProviderBytes int64   `json:"providerBytes"`
	ProviderCost  float64 `json:"providerCost"`
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handlePolicies(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}
	writeJSON(w, http.StatusOK, s.engine.Snapshot())
}

func (s *Server) handleTransfer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	var req policy.TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request", Details: err.Error()})
		return
	}

	outcome, err := s.engine.Evaluate(req)
	if err != nil {
		writeJSON(w, http.StatusForbidden, transferResponse{Allowed: false, Reason: err.Error(), Window: outcome.WindowEnds})
		return
	}

	if !outcome.Allowed {
		writeJSON(w, http.StatusForbidden, transferResponse{Allowed: false, Reason: outcome.Reason, Window: outcome.WindowEnds})
		return
	}

	manifestRecord := &manifest.Record{
		ManifestID:  uuid.NewString(),
		RequestID:   req.RequestID,
		PolicyID:    outcome.PolicyID,
		Destination: req.Destination,
		DataClass:   req.DataClass,
		Bytes:       req.Bytes,
		Cost:        outcome.Cost,
		Timestamp:   time.Now().UTC(),
	}
	signature, err := s.signer.Sign(manifestRecord)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "signing failed", Details: err.Error()})
		return
	}
	manifestRecord.Signature = signature
	s.store.Save(manifestRecord)

	writeJSON(w, http.StatusCreated, transferResponse{Allowed: true, Manifest: manifestRecord, Window: outcome.WindowEnds})
}

func (s *Server) handleManifest(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/manifests/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "manifest id required"})
		return
	}
	id := parts[0]

	switch {
	case r.Method == http.MethodGet && len(parts) == 1:
		record, ok := s.store.Get(id)
		if !ok {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "manifest not found"})
			return
		}
		writeJSON(w, http.StatusOK, record)
		return
	case r.Method == http.MethodPost && len(parts) == 2 && parts[1] == "reconcile":
		var req reconcileRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request", Details: err.Error()})
			return
		}
		record, err := s.store.Reconcile(id, req.ProviderBytes, req.ProviderCost)
		if err != nil {
			writeJSON(w, http.StatusConflict, errorResponse{Error: "reconciliation failed", Details: err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, record)
		return
	default:
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "unsupported operation"})
		return
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
