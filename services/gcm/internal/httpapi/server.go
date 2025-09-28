package httpapi

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/summit/gcm/internal/service"
)

// Server exposes the service via HTTP APIs.
type Server struct {
	svc *service.Service
}

// New constructs a server wrapper.
func New(svc *service.Service) *Server {
	return &Server{svc: svc}
}

// Router configures the HTTP routes for the metering service.
func (s *Server) Router() http.Handler {
	r := chi.NewRouter()

	r.Post("/api/v1/jobs", s.handleJob)
	r.Get("/api/v1/accounts/{accountId}/manifest", s.handleManifest)
	r.Post("/api/v1/provider-usage", s.handleProviderUsage)
	r.Get("/api/v1/accounts/{accountId}/reconciliation", s.handleReconciliation)

	return r
}

func (s *Server) handleJob(w http.ResponseWriter, r *http.Request) {
	var req service.JobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	if req.JobID == "" {
		req.JobID = strconv.FormatInt(time.Now().UnixNano(), 10)
	}

	resp, violation, err := s.svc.RecordJob(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if violation != nil {
		writeJSON(w, http.StatusConflict, violation)
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (s *Server) handleManifest(w http.ResponseWriter, r *http.Request) {
	accountID := chi.URLParam(r, "accountId")
	manifest, err := s.svc.GenerateManifest(accountID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, manifest)
}

func (s *Server) handleProviderUsage(w http.ResponseWriter, r *http.Request) {
	var req service.ProviderUsageReport
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if req.Currency == "" {
		req.Currency = os.Getenv("GCM_CURRENCY")
	}
	if req.Currency == "" {
		req.Currency = "USD"
	}
	if req.ReportedAt.IsZero() {
		req.ReportedAt = time.Now().UTC()
	}
	s.svc.SubmitProviderUsage(req)
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

func (s *Server) handleReconciliation(w http.ResponseWriter, r *http.Request) {
	accountID := chi.URLParam(r, "accountId")
	summary, err := s.svc.Reconcile(accountID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
