package httpapi

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/summit/bgpr/controller"
)

type Server struct {
	ctrl *controller.Controller
}

type dryRunRequest struct {
	Manifest controller.RolloutManifest `json:"manifest"`
}

type applyRequest struct {
	Manifest controller.RolloutManifest `json:"manifest"`
}

type statusResponse struct {
	CurrentPolicy string                    `json:"currentPolicy"`
	LastResult    *controller.RolloutResult `json:"lastResult"`
	AuditTrail    []controller.AuditEvent   `json:"auditTrail"`
}

func New(ctrl *controller.Controller) *Server {
	return &Server{ctrl: ctrl}
}

func (s *Server) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/bgpr/dry-run", s.handleDryRun)
	mux.HandleFunc("/api/bgpr/rollouts", s.handleApply)
	mux.HandleFunc("/api/bgpr/status", s.handleStatus)
}

func (s *Server) handleDryRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req dryRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	result, err := s.ctrl.DryRun(req.Manifest)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusOK, result)
}

func (s *Server) handleApply(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req applyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	result, err := s.ctrl.Apply(req.Manifest)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusOK, result)
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	policy, result := s.ctrl.CurrentStatus()
	audit := s.ctrl.AuditTrail()
	respondJSON(w, http.StatusOK, statusResponse{
		CurrentPolicy: policy,
		LastResult:    result,
		AuditTrail:    audit,
	})
}

func respondJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	_ = encoder.Encode(body)
}

func MustReadSecret() string {
	secret := os.Getenv("BGPR_MANIFEST_SECRET")
	if secret == "" {
		log.Fatal("BGPR_MANIFEST_SECRET must be set")
	}
	return secret
}
