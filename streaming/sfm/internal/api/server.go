package api

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/summit/streaming/sfm/internal/core"
)

// Server wires HTTP handlers for the streaming fairness monitor.
type Server struct {
	aggregator *core.Aggregator
	signer     *core.SnapshotSigner
}

// NewServer constructs an API server using the provided aggregator and signer.
func NewServer(agg *core.Aggregator, signer *core.SnapshotSigner) *Server {
	return &Server{aggregator: agg, signer: signer}
}

// Routes registers the HTTP handlers.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/events", s.handleEvent)
	mux.HandleFunc("/metrics", s.handleMetrics)
	mux.HandleFunc("/alerts", s.handleAlerts)
	mux.HandleFunc("/snapshots", s.handleSnapshot)
	mux.HandleFunc("/replay", s.handleReplay)
	return mux
}

type eventRequest struct {
	PredictionID   string            `json:"prediction_id"`
	Timestamp      string            `json:"timestamp"`
	Score          float64           `json:"score"`
	PredictedLabel bool              `json:"predicted_label"`
	ActualLabel    bool              `json:"actual_label"`
	Group          string            `json:"group"`
	Attributes     map[string]string `json:"attributes"`
}

func (s *Server) handleEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	var req eventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	evt := core.Event{
		PredictionID:   req.PredictionID,
		Score:          req.Score,
		PredictedLabel: req.PredictedLabel,
		ActualLabel:    req.ActualLabel,
		Group:          req.Group,
		Attributes:     req.Attributes,
	}
	if req.Timestamp != "" {
		ts, err := time.Parse(time.RFC3339Nano, req.Timestamp)
		if err != nil {
			http.Error(w, "invalid timestamp", http.StatusBadRequest)
			return
		}
		evt.Timestamp = ts.UTC()
	}
	snapshot, err := s.aggregator.Ingest(evt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, snapshot)
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	snapshot := s.aggregator.Metrics()
	respondJSON(w, snapshot)
}

func (s *Server) handleAlerts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	alerts := s.aggregator.Alerts()
	respondJSON(w, alerts)
}

type snapshotRequest struct {
	Seed string `json:"seed"`
}

func (s *Server) handleSnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	var req snapshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	signer := s.signer
	if req.Seed != "" {
		signer = core.NewSnapshotSigner(req.Seed)
	}
	snapshot := s.aggregator.Metrics()
	signature, err := signer.Sign(snapshot)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	envelope := core.SnapshotEnvelope{Snapshot: snapshot, Signature: signature}
	respondJSON(w, envelope)
}

type replayRequest struct {
	Path string `json:"path"`
}

func (s *Server) handleReplay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	var req replayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.Path == "" {
		http.Error(w, "path is required", http.StatusBadRequest)
		return
	}
	result, err := core.ReplayFromParquet(req.Path, s.aggregator)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, result)
}

func respondJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	enc.Encode(payload)
}
