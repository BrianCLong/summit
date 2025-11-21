package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/summit/drift-sentinel/internal/canary"
	"github.com/summit/drift-sentinel/internal/dashboard"
	"github.com/summit/drift-sentinel/internal/featurestore"
	"github.com/summit/drift-sentinel/internal/model"
	"github.com/summit/drift-sentinel/internal/replay"
	"github.com/summit/drift-sentinel/internal/sentinel"
	"github.com/summit/drift-sentinel/internal/webhook"
)

func main() {
	var (
		listenAddr     = flag.String("listen", ":8080", "address to expose the HTTP API")
		windowSize     = flag.Int("window", 50, "sliding window size for metrics")
		psiThreshold   = flag.Float64("psi-threshold", 0.2, "alert threshold for PSI")
		klThreshold    = flag.Float64("kl-threshold", 0.5, "alert threshold for KL divergence")
		errorThreshold = flag.Float64("error-threshold", 0.05, "alert threshold for error delta")
		sampleRate     = flag.Float64("sample-rate", 1.0, "fraction of traffic processed by the shadow model")
		historySize    = flag.Int("history", 1024, "number of drift points retained for the dashboard")
		webhookList    = flag.String("webhooks", "", "comma separated list of drift webhook endpoints")
		seed           = flag.Int64("seed", time.Now().UnixNano(), "random seed for deterministic sampling")
	)
	flag.Parse()

	cfg := sentinel.DefaultConfig()
	cfg.WindowSize = *windowSize
	cfg.SampleRate = *sampleRate
	cfg.HistorySize = *historySize
	cfg.RandomSeed = *seed
	cfg.Thresholds.PSI = *psiThreshold
	cfg.Thresholds.KLDivergence = *klThreshold
	cfg.Thresholds.ErrorDelta = *errorThreshold

	mdl := &model.LinearModel{Weights: map[string]float64{"bias": 1.0}, Bias: 0}
	snapshotter := featurestore.NewSnapshotter(cfg.HistorySize)
	gate := canary.NewGate(cfg.WindowSize)

	var dispatcher *webhook.Dispatcher
	if trimmed := strings.TrimSpace(*webhookList); trimmed != "" {
		endpoints := filterEmpty(strings.Split(trimmed, ","))
		dispatcher = webhook.NewDispatcher(endpoints, nil, 5*time.Second)
	}

	s := sentinel.New(cfg, mdl, snapshotter, dispatcher, gate)
	dash := dashboard.NewServer(s)

	mux := http.NewServeMux()
	mux.Handle("/dashboard/", http.StripPrefix("/dashboard", dash.Handler()))
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/ingest", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var payload ingestRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		ts := time.Now()
		if payload.Timestamp != "" {
			parsed, err := time.Parse(time.RFC3339Nano, payload.Timestamp)
			if err != nil {
				http.Error(w, "invalid timestamp", http.StatusBadRequest)
				return
			}
			ts = parsed
		}
		event := sentinel.Event{
			Timestamp:        ts,
			Features:         payload.Features,
			ProductionOutput: payload.Production,
			Actual:           payload.Actual,
		}
		if err := s.ProcessEvent(r.Context(), event); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusAccepted)
	})
	mux.HandleFunc("/replay", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var payload replayRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if payload.Path == "" {
			http.Error(w, "path is required", http.StatusBadRequest)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()
		if err := replay.Run(ctx, s, payload.Path); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusAccepted)
	})

	server := &http.Server{Addr: *listenAddr, Handler: mux}
	log.Printf("drift sentinel listening on %s", *listenAddr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Printf("server error: %v", err)
		os.Exit(1)
	}
}

type ingestRequest struct {
	Timestamp  string             `json:"timestamp"`
	Production float64            `json:"production"`
	Actual     float64            `json:"actual"`
	Features   map[string]float64 `json:"features"`
}

type replayRequest struct {
	Path string `json:"path"`
}

func filterEmpty(values []string) []string {
	var out []string
	for _, v := range values {
		trimmed := strings.TrimSpace(v)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
