package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/summit/qpg/internal/policy"
	"github.com/summit/qpg/internal/tokenvault"
)

type Server struct {
	policies *policy.Manager
	vault    *tokenvault.TokenVault
	gate     *tokenvault.RecoveryGate
}

type TokenizeRequest struct {
	Tenant  string         `json:"tenant"`
	Purpose string         `json:"purpose"`
	Payload map[string]any `json:"payload"`
}

type TokenizeResponse struct {
	Payload map[string]any `json:"payload"`
}

type RevealRequest struct {
	Tenant  string   `json:"tenant"`
	Purpose string   `json:"purpose"`
	Field   string   `json:"field"`
	Token   string   `json:"token"`
	Shares  []string `json:"shares"`
}

type RevealResponse struct {
	Value string `json:"value"`
}

func New(policies *policy.Manager, vault *tokenvault.TokenVault, gate *tokenvault.RecoveryGate) *Server {
	return &Server{policies: policies, vault: vault, gate: gate}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/tokenize", s.handleTokenize)
	mux.HandleFunc("/reveal", s.handleReveal)
	return mux
}

func (s *Server) handleTokenize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req TokenizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if _, ok := s.policies.DefinitionFor(req.Tenant, req.Purpose); !ok {
		http.Error(w, "policy not found", http.StatusNotFound)
		return
	}
	transformed := make(map[string]any, len(req.Payload))
	for field, raw := range req.Payload {
		rule, hasRule := s.policies.RuleForField(req.Tenant, req.Purpose, field)
		if !hasRule || strings.EqualFold(rule.Method, "passthrough") {
			transformed[field] = raw
			continue
		}
		strVal, ok := raw.(string)
		if !ok {
			transformed[field] = raw
			continue
		}
		ctx := tokenvault.Context{Tenant: req.Tenant, Purpose: req.Purpose, Field: field}
		switch strings.ToLower(rule.Method) {
		case "tokenize":
			transformed[field] = s.vault.Tokenize(ctx, strVal)
		case "hash":
			transformed[field] = s.vault.Hash(ctx, strVal)
		default:
			transformed[field] = raw
		}
	}
	// Ensure non-mentioned fields are still copied.
	for field, raw := range req.Payload {
		if _, exists := transformed[field]; !exists {
			transformed[field] = raw
		}
	}
	writeJSON(w, http.StatusOK, TokenizeResponse{Payload: transformed})
}

func (s *Server) handleReveal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req RevealRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	rule, ok := s.policies.RuleForField(req.Tenant, req.Purpose, req.Field)
	if !ok || !rule.AllowReveal || !strings.EqualFold(rule.Method, "tokenize") {
		http.Error(w, "reveal not permitted", http.StatusForbidden)
		return
	}
	if !s.gate.Authorize(req.Shares) {
		http.Error(w, "quorum required", http.StatusForbidden)
		return
	}
	ctx := tokenvault.Context{Tenant: req.Tenant, Purpose: req.Purpose, Field: req.Field}
	value, found := s.vault.Reveal(ctx, req.Token)
	if !found {
		http.Error(w, "token not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, RevealResponse{Value: value})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		fmt.Printf("failed to encode response: %v\n", err)
	}
}
