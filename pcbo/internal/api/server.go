package api

import (
	"encoding/json"
	"net/http"

	"pcbo/internal/orchestrator"
)

// Server implements the HTTP interface for the orchestrator engine.
type Server struct {
	engine orchestrator.Engine
}

// NewServer instantiates a Server with default engine.
func NewServer() *Server {
	return &Server{engine: orchestrator.NewEngine()}
}

// Handler returns the HTTP handler configured with routing.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/plan", s.plan)
	mux.HandleFunc("/v1/dry-run", s.dryRun)
	mux.HandleFunc("/v1/execute", s.execute)
	return mux
}

func (s *Server) plan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	req, normalized, err := s.parseRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	plan := s.engine.Plan(normalized)
	response := map[string]any{
		"runId":    req.RunID,
		"dataset":  req.Dataset,
		"plan":     plan,
		"metadata": req.Metadata,
	}
	s.writeJSON(w, http.StatusOK, response)
}

func (s *Server) dryRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	_, normalized, err := s.parseRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	result := s.engine.DryRun(normalized)
	s.writeJSON(w, http.StatusOK, result)
}

func (s *Server) execute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	_, normalized, err := s.parseRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	result := s.engine.Execute(normalized)
	status := http.StatusOK
	if len(result.Report.PolicyViolations) > 0 {
		status = http.StatusConflict
	}
	s.writeJSON(w, status, result)
}

func (s *Server) parseRequest(r *http.Request) (orchestrator.BackfillRequest, orchestrator.NormalizedRequest, error) {
	decoder := json.NewDecoder(r.Body)
	var req orchestrator.BackfillRequest
	if err := decoder.Decode(&req); err != nil {
		return orchestrator.BackfillRequest{}, orchestrator.NormalizedRequest{}, err
	}
	normalized, err := req.Normalize()
	if err != nil {
		return orchestrator.BackfillRequest{}, orchestrator.NormalizedRequest{}, err
	}
	return req, normalized, nil
}

func (s *Server) writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	_ = encoder.Encode(payload)
}
