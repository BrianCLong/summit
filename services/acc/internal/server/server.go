package server

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/summit/acc/internal/config"
	"github.com/summit/acc/internal/planner"
)

type Server struct {
	planner *planner.Planner
	mux     *http.ServeMux
}

type planRequest struct {
	planner.Request
}

type replicaUpdate struct {
	Name        string `json:"name"`
	LatencyMs   int    `json:"latencyMs"`
	StalenessMs int    `json:"stalenessMs"`
}

func New(planner *planner.Planner) *Server {
	s := &Server{planner: planner, mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.mux.HandleFunc("/plan", s.handlePlan)
	s.mux.HandleFunc("/replica", s.handleReplica)
	s.mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
}

func (s *Server) handlePlan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	var req planRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	plan, err := s.planner.Plan(ctx, req.Request)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, plan)
}

func (s *Server) handleReplica(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	var update replicaUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		http.Error(w, "invalid update", http.StatusBadRequest)
		return
	}
	if err := s.planner.UpdateReplica(update.Name, planner.ReplicaMetrics{
		LatencyMs:   update.LatencyMs,
		StalenessMs: update.StalenessMs,
	}); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(payload)
}

func ListenAndServe(addr string, cfg *config.Config) error {
	pl := planner.New(cfg)
	srv := New(pl)
	server := &http.Server{
		Addr:              addr,
		Handler:           srv.mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("acc server listening on %s", addr)
	return server.ListenAndServe()
}
