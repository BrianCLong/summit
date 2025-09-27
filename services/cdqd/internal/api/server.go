package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"summit/services/cdqd/internal/core"
	"summit/services/cdqd/internal/models"
	"summit/services/cdqd/internal/util"
)

// Server exposes the CDQD HTTP API.
type Server struct {
	Store *core.Store
}

func NewServer(store *core.Store) *Server {
	return &Server{Store: store}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/metrics/ingest", s.handleMetricIngest)
	mux.HandleFunc("/api/v1/metrics", s.handleMetrics)
	mux.HandleFunc("/api/v1/rules", s.handleRules)
	mux.HandleFunc("/api/v1/datasets/", s.handleDatasetRows)
	mux.HandleFunc("/api/v1/suppressions", s.handleSuppressions)
	mux.HandleFunc("/api/v1/anomalies", s.handleAnomalies)
	mux.HandleFunc("/api/v1/backfill", s.handleBackfill)
	mux.HandleFunc("/api/v1/replay", s.handleReplay)
	mux.HandleFunc("/api/v1/config", s.handleConfig)
	return mux
}

func (s *Server) handleMetricIngest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		util.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}
	var req struct {
		Points []models.DataPoint   `json:"points"`
		Config *models.MetricConfig `json:"config"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.UseNumber()
	if err := decoder.Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}
	if len(req.Points) == 0 {
		util.WriteError(w, http.StatusBadRequest, errors.New("points are required"))
		return
	}
	anomalies, err := s.Store.IngestMetric(req.Points, req.Config)
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}
	util.WriteJSON(w, http.StatusOK, map[string]any{"anomalies": anomalies})
}

func (s *Server) handleBackfill(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		util.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}
	var req struct {
		Points []models.DataPoint   `json:"points"`
		Config *models.MetricConfig `json:"config"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.UseNumber()
	if err := decoder.Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}
	anomalies, err := s.Store.IngestMetric(req.Points, req.Config)
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}
	util.WriteJSON(w, http.StatusOK, map[string]any{"anomalies": anomalies})
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		data, err := s.Store.MarshalConfig()
		if err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
	default:
		util.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
	}
}

func (s *Server) handleRules(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var rule models.Rule
		decoder := json.NewDecoder(r.Body)
		decoder.UseNumber()
		if err := decoder.Decode(&rule); err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
		if err := s.Store.AddRule(rule); err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
		util.WriteJSON(w, http.StatusCreated, rule)
	case http.MethodGet:
		anomalies := s.Store.ListAnomalies()
		rules := map[string]models.Rule{}
		for _, anomaly := range anomalies {
			if anomaly.Type == "rule" {
				rules[anomaly.RuleID] = models.Rule{ID: anomaly.RuleID, Description: anomaly.RuleDescription}
			}
		}
		util.WriteJSON(w, http.StatusOK, rules)
	default:
		util.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
	}
}

func (s *Server) handleDatasetRows(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		util.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/datasets/")
	if path == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("dataset name required"))
		return
	}
	parts := strings.SplitN(path, "/", 2)
	dataset := parts[0]
	var req struct {
		Rows      []map[string]any `json:"rows"`
		Timestamp *time.Time       `json:"timestamp"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.UseNumber()
	if err := decoder.Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}
	if len(req.Rows) == 0 {
		util.WriteError(w, http.StatusBadRequest, errors.New("rows are required"))
		return
	}
	ts := time.Now().UTC()
	if req.Timestamp != nil && !req.Timestamp.IsZero() {
		ts = req.Timestamp.UTC()
	}
	allAnomalies := make([]models.Anomaly, 0)
	for _, row := range req.Rows {
		record := models.Record{Dataset: dataset, Timestamp: ts, Values: row}
		anomalies, err := s.Store.EvaluateRecord(record)
		if err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
		allAnomalies = append(allAnomalies, anomalies...)
	}
	util.WriteJSON(w, http.StatusOK, map[string]any{"anomalies": allAnomalies})
}

func (s *Server) handleSuppressions(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var sup models.Suppression
		decoder := json.NewDecoder(r.Body)
		decoder.UseNumber()
		if err := decoder.Decode(&sup); err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
		if err := s.Store.AddSuppression(sup); err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
		util.WriteJSON(w, http.StatusCreated, sup)
	default:
		util.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
	}
}

func (s *Server) handleAnomalies(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		util.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}
	anomalies := s.Store.ListAnomalies()
	util.WriteJSON(w, http.StatusOK, map[string]any{"anomalies": anomalies})
}

func (s *Server) handleReplay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		util.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}
	result, err := s.Store.Replay()
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}
	util.WriteJSON(w, http.StatusOK, result)
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		util.WriteError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}
	data, err := s.Store.MarshalConfig()
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
