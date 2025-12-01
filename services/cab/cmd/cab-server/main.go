package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/google/uuid"

	"github.com/summit/cab/internal/challenge"
	"github.com/summit/cab/internal/engine"
	"github.com/summit/cab/internal/risk"
)

func main() {
	srv, err := newServer()
	if err != nil {
		log.Fatalf("failed to start cab server: %v", err)
	}
	port := os.Getenv("CAB_PORT")
	if port == "" {
		port = "8085"
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/policies", srv.handlePolicies)
	mux.HandleFunc("/evaluate", srv.handleEvaluate)
	mux.HandleFunc("/scenarios", srv.handleScenarios)
	mux.HandleFunc("/scenarios/", srv.handleScenarioByID)
	log.Printf("CAB listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, withJSON(mux)))
}

type server struct {
	engine    *engine.Engine
	policies  []engine.Policy
	scenarios *scenarioStore
}

func newServer() (*server, error) {
	policies := defaultPolicies()
	scorers := []risk.Scorer{
		risk.GeoScorer{Allowed: []string{"us", "ca", "uk"}, Elevated: []string{"de", "fr"}, UnknownIsRisk: true},
		risk.DevicePostureScorer{TrustedPostures: []string{"trusted", "managed"}},
		risk.AnomalyScorer{Name: "anomaly", StepUpFloor: 0.35, DenyFloor: 0.75},
	}
	registry := challenge.NewRegistry(
		challenge.NewTOTPChallenge("654321"),
		challenge.NewHardwareKeyChallenge("cab-hardware-assertion"),
	)
	eng, err := engine.New(policies, scorers, registry)
	if err != nil {
		return nil, err
	}
	return &server{engine: eng, policies: policies, scenarios: newScenarioStore()}, nil
}

func (s *server) handlePolicies(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	writeJSON(w, s.policies)
}

func (s *server) handleEvaluate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req engine.Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request payload")
		return
	}
	resp, err := s.engine.Evaluate(req)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, resp)
}

func (s *server) handleScenarios(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, s.scenarios.List())
	case http.MethodPost:
		var body struct {
			Name    string         `json:"name"`
			Request engine.Request `json:"request"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid request payload")
			return
		}
		decision, err := s.engine.Evaluate(body.Request)
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		scenario := Scenario{ID: uuid.NewString(), Name: body.Name, Request: body.Request, Response: decision}
		s.scenarios.Save(scenario)
		writeJSON(w, scenario)
	default:
		writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *server) handleScenarioByID(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/scenarios/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeErr(w, http.StatusNotFound, "scenario id missing")
		return
	}
	id := parts[0]
	scenario, ok := s.scenarios.Get(id)
	if !ok {
		writeErr(w, http.StatusNotFound, "scenario not found")
		return
	}
	if len(parts) == 1 {
		if r.Method != http.MethodGet {
			writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		writeJSON(w, scenario)
		return
	}
	if parts[1] == "replay" {
		if r.Method != http.MethodPost {
			writeErr(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		decision, err := s.engine.Evaluate(scenario.Request)
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		match := compareDecisions(decision, scenario.Response)
		writeJSON(w, map[string]any{"match": match, "decision": decision})
		return
	}
	writeErr(w, http.StatusNotFound, "unsupported scenario path")
}

func compareDecisions(a, b engine.Response) bool {
	if a.Decision != b.Decision || a.RiskLevel != b.RiskLevel || len(a.RequiredChallenges) != len(b.RequiredChallenges) {
		return false
	}
	return true
}

type scenarioStore struct {
	mu        sync.RWMutex
	scenarios map[string]Scenario
}

type Scenario struct {
	ID       string          `json:"id"`
	Name     string          `json:"name"`
	Request  engine.Request  `json:"request"`
	Response engine.Response `json:"response"`
}

func newScenarioStore() *scenarioStore {
	return &scenarioStore{scenarios: make(map[string]Scenario)}
}

func (s *scenarioStore) Save(sc Scenario) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.scenarios[sc.ID] = sc
}

func (s *scenarioStore) Get(id string) (Scenario, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sc, ok := s.scenarios[id]
	return sc, ok
}

func (s *scenarioStore) List() []Scenario {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Scenario, 0, len(s.scenarios))
	for _, sc := range s.scenarios {
		out = append(out, sc)
	}
	return out
}

func writeJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("failed to encode response: %v", err)
	}
}

func writeErr(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func withJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		next.ServeHTTP(w, r)
	})
}

func defaultPolicies() []engine.Policy {
	return []engine.Policy{
		{
			ID:          "workspace-admin",
			Description: "Privileged workspace administration operations",
			Actions:     []string{"workspace:update", "workspace:delete"},
			Subject: map[string]engine.AttributeCondition{
				"role": {Equals: "admin"},
			},
			Resource: map[string]engine.AttributeCondition{
				"classification": {In: []string{"internal", "confidential"}},
			},
			Effect:           engine.DecisionAllow,
			AllowRisk:        risk.LevelLow,
			StepUpRisk:       risk.LevelMedium,
			StepUpChallenges: []string{"totp", "hardware-key"},
		},
		{
			ID:          "workspace-viewer",
			Description: "Read access for trusted analysts",
			Actions:     []string{"workspace:view"},
			Subject: map[string]engine.AttributeCondition{
				"role": {In: []string{"analyst", "admin"}},
			},
			Resource: map[string]engine.AttributeCondition{
				"classification": {NotIn: []string{"restricted"}},
			},
			Effect:     engine.DecisionAllow,
			AllowRisk:  risk.LevelMedium,
			StepUpRisk: risk.LevelMedium,
		},
	}
}
