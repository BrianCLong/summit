package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/summit/escp/internal/agents"
	"github.com/summit/escp/internal/backends"
	"github.com/summit/escp/internal/service"
	"github.com/summit/escp/internal/sla"
)

type httpServer struct {
	svc *service.Service
}

func main() {
	storage := backends.NewInMemoryBackend([]backends.Record{{Key: "object:123", Subject: "alice", Value: "blob"}, {Key: "object:456", Subject: "bob", Value: "blob"}})
	cache := backends.NewInMemoryBackend([]backends.Record{{Key: "cache:session:123", Subject: "alice", Value: "token"}})
	feature := backends.NewInMemoryBackend([]backends.Record{{Key: "feature:user:alice", Subject: "alice", Value: "vector"}})
	search := backends.NewInMemoryBackend([]backends.Record{{Key: "search:doc:1", Subject: "alice", Value: "doc"}})

	var agentList []agents.Agent
	agentList = append(agentList, mustAgent(agents.New(agents.Config{System: "object-storage", Classification: "storage", Backend: storage})))
	agentList = append(agentList, mustAgent(agents.New(agents.Config{System: "realtime-cache", Classification: "cache", Backend: cache})))
	agentList = append(agentList, mustAgent(agents.New(agents.Config{System: "feature-store", Classification: "feature-store", Backend: feature})))
	agentList = append(agentList, mustAgent(agents.New(agents.Config{System: "search-index", Classification: "search-index", Backend: search})))

	tracker := sla.NewTracker()
	svc := service.New(agentList, tracker)

	server := &httpServer{svc: svc}

	mux := http.NewServeMux()
	mux.HandleFunc("/escp/v1/run", server.handleRun(false))
	mux.HandleFunc("/escp/v1/dry-run", server.handleRun(true))
	mux.HandleFunc("/escp/v1/sla", server.handleSLA)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("escp server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("listen: %v", err)
	}
}

func mustAgent(agent agents.Agent, err error) agents.Agent {
	if err != nil {
		log.Fatalf("init agent: %v", err)
	}
	return agent
}

func (s *httpServer) handleRun(forceDryRun bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		defer r.Body.Close()
		var req service.Request
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		req.DryRun = req.DryRun || forceDryRun
		resp, err := s.svc.Process(context.Background(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, resp)
	}
}

func (s *httpServer) handleSLA(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	report := s.svc.SLAReport()
	writeJSON(w, report)
}

func writeJSON(w http.ResponseWriter, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(payload)
}
