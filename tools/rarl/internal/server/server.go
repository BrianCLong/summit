package server

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/summit/rarl/internal/rarl"
)

// Service wires HTTP handlers to the limiter manager.
type Service struct {
	manager *rarl.Manager
}

// New creates a Service.
func New(manager *rarl.Manager) *Service {
	return &Service{manager: manager}
}

// Routes returns the HTTP mux configured for the service.
func (s *Service) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/decision", s.handleDecision)
	mux.HandleFunc("/snapshot/", s.handleSnapshot)
	return mux
}

type decisionPayload struct {
	TenantID     string  `json:"tenantId"`
	ToolID       string  `json:"toolId"`
	Units        int     `json:"units"`
	Geo          string  `json:"geo"`
	PolicyTier   string  `json:"policyTier"`
	AnomalyScore float64 `json:"anomalyScore"`
	PriorityLane string  `json:"priorityLane"`
	Timestamp    string  `json:"timestamp"`
}

type decisionResponse struct {
	Decision rarl.Decision `json:"decision"`
}

func (s *Service) handleDecision(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	var payload decisionPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	reqTime := time.Time{}
	if payload.Timestamp != "" {
		parsed, err := time.Parse(time.RFC3339Nano, payload.Timestamp)
		if err != nil {
			http.Error(w, "invalid timestamp", http.StatusBadRequest)
			return
		}
		reqTime = parsed
	}

	decision, err := s.manager.Evaluate(rarl.DecisionRequest{
		TenantID:     payload.TenantID,
		ToolID:       payload.ToolID,
		Units:        payload.Units,
		Geo:          payload.Geo,
		PolicyTier:   payload.PolicyTier,
		AnomalyScore: payload.AnomalyScore,
		PriorityLane: payload.PriorityLane,
		Timestamp:    reqTime,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSON(w, http.StatusOK, decisionResponse{Decision: decision})
}

func (s *Service) handleSnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	tenantID := r.URL.Path[len("/snapshot/"):]
	if tenantID == "" {
		http.Error(w, "tenant id required", http.StatusBadRequest)
		return
	}

	snapshot, signature, err := s.manager.Snapshot(tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"snapshot":  snapshot,
		"signature": signature,
	}
	writeJSON(w, http.StatusOK, response)
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
