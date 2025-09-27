package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"summit/services/pda/internal/engine"
)

// Handler wires the PDA engine into HTTP routes.
type Handler struct {
	Engine      *engine.Engine
	RuleUpdates chan engine.RuleUpdate
	StreamCtx   context.Context
}

// NewHandler constructs a handler with buffered streaming capacity.
func NewHandler(ctx context.Context, eng *engine.Engine, streamBuffer int) *Handler {
	if streamBuffer <= 0 {
		streamBuffer = 32
	}
	return &Handler{
		Engine:      eng,
		RuleUpdates: make(chan engine.RuleUpdate, streamBuffer),
		StreamCtx:   ctx,
	}
}

// Register attaches routes to a ServeMux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/health", h.handleHealth)
	mux.HandleFunc("/api/v1/events", h.handleEvent)
	mux.HandleFunc("/api/v1/alerts", h.handleAlerts)
	mux.HandleFunc("/api/v1/explain", h.handleExplain)
	mux.HandleFunc("/api/v1/contracts", h.handleContracts)
	mux.HandleFunc("/api/v1/rules/stream", h.handleRuleStream)
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":    "ok",
		"time":      time.Now().UTC(),
		"fpRate":    h.Engine.FalsePositiveRate(),
		"contracts": len(h.Engine.SnapshotContracts()),
	})
}

func (h *Handler) handleEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	var evt engine.Event
	if err := json.NewDecoder(r.Body).Decode(&evt); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	verdict := h.Engine.Evaluate(evt)
	writeJSON(w, verdict)
}

func (h *Handler) handleAlerts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, h.Engine.Alerts())
}

func (h *Handler) handleExplain(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	eventID := r.URL.Query().Get("eventId")
	if eventID == "" {
		http.Error(w, "eventId required", http.StatusBadRequest)
		return
	}
	trace, err := h.Engine.Explain(eventID)
	if err != nil {
		if errors.Is(err, engine.ErrTraceNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, trace)
}

func (h *Handler) handleContracts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, h.Engine.SnapshotContracts())
	case http.MethodPost:
		defer r.Body.Close()
		var contracts []engine.ConsentContract
		if err := json.NewDecoder(r.Body).Decode(&contracts); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		h.Engine.LoadContracts(contracts)
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *Handler) handleRuleStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	ctx, cancel := context.WithCancel(h.StreamCtx)
	defer cancel()
	if err := engine.StreamRuleUpdates(ctx, r.Body, h.RuleUpdates); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
