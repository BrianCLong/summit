package server

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/summit/caff/evaluator"
	"github.com/summit/caff/policy"
)

type Server struct {
	router *chi.Mux
	store  *policy.Store
	eval   *evaluator.Evaluator
}

type EvaluateRequest struct {
	FlagKey string                `json:"flagKey"`
	Context policy.SubjectContext `json:"context"`
}

type EvaluateResponse struct {
	Decision    policy.Decision      `json:"decision"`
	ExplainPath []policy.ExplainStep `json:"explainPath"`
}

type PolicyResponse struct {
	Policy policy.Policy `json:"policy"`
}

type DryRunRequest struct {
	OldPolicy policy.Policy     `json:"oldPolicy"`
	NewPolicy policy.Policy     `json:"newPolicy"`
	Contexts  []EvaluateRequest `json:"contexts,omitempty"`
}

type DryRunResponse struct {
	Changes   []policy.FlagChange    `json:"changes"`
	Decisions []DryRunDecisionChange `json:"decisions"`
}

type DryRunDecisionChange struct {
	FlagKey     string                `json:"flagKey"`
	Context     policy.SubjectContext `json:"context"`
	OldDecision evaluator.Result      `json:"oldDecision"`
	NewDecision evaluator.Result      `json:"newDecision"`
}

func New() *Server {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	s := &Server{
		router: r,
		store:  policy.NewStore(),
		eval:   evaluator.New(),
	}

	r.Get("/healthz", s.handleHealth)
	r.Get("/policy", s.handleGetPolicy)
	r.Put("/policy", s.handleSetPolicy)
	r.Post("/evaluate", s.handleEvaluate)
	r.Post("/dry-run", s.handleDryRun)

	return s
}

func (s *Server) Router() http.Handler {
	return s.router
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) handleGetPolicy(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, PolicyResponse{Policy: s.store.Get()})
}

func (s *Server) handleSetPolicy(w http.ResponseWriter, r *http.Request) {
	var payload PolicyResponse
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondErr(w, http.StatusBadRequest, err)
		return
	}
	sanitizePolicy(&payload.Policy)
	s.store.Set(payload.Policy)
	respondJSON(w, http.StatusOK, PolicyResponse{Policy: s.store.Get()})
}

func (s *Server) handleEvaluate(w http.ResponseWriter, r *http.Request) {
	var req EvaluateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, err)
		return
	}
	pol := s.store.Get()
	flag, ok := pol.Flags[req.FlagKey]
	if !ok {
		respondJSON(w, http.StatusOK, EvaluateResponse{
			Decision:    policy.DecisionDeny,
			ExplainPath: []policy.ExplainStep{{Rule: "flag", Result: "not-found", Details: req.FlagKey}},
		})
		return
	}
	ensureTimestamp(&req.Context)
	res := s.eval.Evaluate(flag, req.Context)
	respondJSON(w, http.StatusOK, EvaluateResponse{Decision: res.Decision, ExplainPath: res.ExplainPath})
}

func (s *Server) handleDryRun(w http.ResponseWriter, r *http.Request) {
	var req DryRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, err)
		return
	}
	sanitizePolicy(&req.OldPolicy)
	sanitizePolicy(&req.NewPolicy)

	resp := DryRunResponse{
		Changes:   policy.Diff(req.OldPolicy, req.NewPolicy),
		Decisions: []DryRunDecisionChange{},
	}

	eval := evaluator.New()
	for _, ctx := range req.Contexts {
		ensureTimestamp(&ctx.Context)
		oldFlag, oldOK := req.OldPolicy.Flags[ctx.FlagKey]
		newFlag, newOK := req.NewPolicy.Flags[ctx.FlagKey]
		if !oldOK && !newOK {
			continue
		}
		var oldRes evaluator.Result
		if oldOK {
			oldRes = eval.Evaluate(oldFlag, ctx.Context)
		} else {
			oldRes = evaluator.Result{Decision: policy.DecisionDeny, ExplainPath: []policy.ExplainStep{{Rule: "flag", Result: "not-found"}}}
		}
		var newRes evaluator.Result
		if newOK {
			newRes = eval.Evaluate(newFlag, ctx.Context)
		} else {
			newRes = evaluator.Result{Decision: policy.DecisionDeny, ExplainPath: []policy.ExplainStep{{Rule: "flag", Result: "not-found"}}}
		}
		if newRes.Decision != oldRes.Decision || !explainEqual(oldRes.ExplainPath, newRes.ExplainPath) {
			resp.Decisions = append(resp.Decisions, DryRunDecisionChange{
				FlagKey:     ctx.FlagKey,
				Context:     ctx.Context,
				OldDecision: oldRes,
				NewDecision: newRes,
			})
		}
	}

	respondJSON(w, http.StatusOK, resp)
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondErr(w http.ResponseWriter, status int, err error) {
	respondJSON(w, status, map[string]string{"error": err.Error()})
}

func explainEqual(a, b []policy.ExplainStep) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func ensureTimestamp(ctx *policy.SubjectContext) {
	if ctx.EvaluatedAt.IsZero() {
		ctx.EvaluatedAt = time.Now().UTC()
	}
}

func sanitizePolicy(p *policy.Policy) {
	if p.Flags == nil {
		p.Flags = map[string]policy.Flag{}
		return
	}
	for key, flag := range p.Flags {
		if flag.Rollout.Percentage <= 0 {
			flag.Rollout = policy.DefaultRollout()
		}
		if flag.ExpiresAt.IsZero() {
			flag.ExpiresAt = time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC)
		} else {
			flag.ExpiresAt = flag.ExpiresAt.UTC()
		}
		flag.Key = key
		p.Flags[key] = flag
	}
}
