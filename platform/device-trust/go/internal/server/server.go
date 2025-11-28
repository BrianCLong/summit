package server

import (
	"encoding/json"
	"log"
	"net/http"

	"platform/device-trust/internal/attestation"
	"platform/device-trust/internal/policy"
	"platform/device-trust/internal/privacy"
)

type EvaluateRequest struct {
	Policy policy.Policy             `json:"policy"`
	Signal attestation.PostureSignal `json:"signal"`
}

type SimulatorRequest struct {
	Policy   policy.Policy               `json:"policy"`
	Fixtures []attestation.PostureSignal `json:"fixtures"`
}

func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func evaluateHandler(w http.ResponseWriter, r *http.Request) {
	var req EvaluateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	filtered := privacy.Filter(req.Signal)
	result := policy.Evaluate(req.Policy, filtered)
	respondJSON(w, http.StatusOK, result)
}

func simulatorHandler(w http.ResponseWriter, r *http.Request) {
	var req SimulatorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	results := make([]interface{}, 0, len(req.Fixtures))
	for _, fixture := range req.Fixtures {
		filtered := privacy.Filter(fixture)
		results = append(results, policy.Evaluate(req.Policy, filtered))
	}
	respondJSON(w, http.StatusOK, results)
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/evaluate", evaluateHandler)
	mux.HandleFunc("/simulate", simulatorHandler)
	return mux
}

func Listen(addr string) {
	log.Printf("device trust server listening on %s", addr)
	if err := http.ListenAndServe(addr, Router()); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
