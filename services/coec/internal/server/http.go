package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/summit-hq/coec/internal/aggregation"
	"github.com/summit-hq/coec/internal/models"
	"github.com/summit-hq/coec/internal/service"
)

// HTTPServer exposes the COEC manager via JSON HTTP APIs.
type HTTPServer struct {
	manager *service.Manager
}

// New constructs an HTTP server wrapper for the manager.
func New(manager *service.Manager) *HTTPServer {
	return &HTTPServer{manager: manager}
}

// Routes configures the router with all endpoints.
func (s *HTTPServer) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Post("/experiments", s.createExperiment)
	r.Post("/experiments/{id}/assign", s.assignCohort)
	r.Post("/experiments/{id}/preregister", s.preregister)
	r.Post("/experiments/{id}/samples", s.issueSample)
	r.Post("/experiments/{id}/metrics", s.submitMetrics)
	r.Post("/experiments/{id}/finalise", s.finalise)
	r.Get("/experiments/{id}/briefs/{orgId}", s.getBrief)

	return r
}

func (s *HTTPServer) createExperiment(w http.ResponseWriter, r *http.Request) {
	var cfg models.ExperimentConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	exp, vrfKey, publicKeys, err := s.manager.CreateExperiment(cfg)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	response := map[string]interface{}{
		"experiment": exp,
		"vrfKey":     vrfKey,
		"publicKeys": publicKeys,
	}
	writeJSON(w, http.StatusCreated, response)
}

func (s *HTTPServer) assignCohort(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var payload struct {
		SubjectID  string                 `json:"subjectId"`
		Attributes map[string]interface{} `json:"attributes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if payload.SubjectID == "" {
		writeError(w, http.StatusBadRequest, errMissing("subjectId"))
		return
	}
	assignment, err := s.manager.AssignCohort(id, payload.SubjectID, payload.Attributes)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, assignment)
}

func (s *HTTPServer) preregister(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var payload models.PreregistrationHook
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if payload.OrgID == "" {
		writeError(w, http.StatusBadRequest, errMissing("orgId"))
		return
	}
	hook, err := s.manager.RecordPreregistration(id, payload)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, hook)
}

func (s *HTTPServer) issueSample(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var payload models.SamplingCertificate
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if payload.OrgID == "" || payload.Cohort == "" {
		writeError(w, http.StatusBadRequest, errMissing("orgId/cohort"))
		return
	}
	cert, err := s.manager.IssueSamplingCertificate(id, payload)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, cert)
}

func (s *HTTPServer) submitMetrics(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var payload struct {
		OrgID   string             `json:"orgId"`
		Cohort  string             `json:"cohort"`
		Mask    float64            `json:"mask"`
		Count   int                `json:"count"`
		Metrics map[string]float64 `json:"metrics"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if payload.OrgID == "" || payload.Cohort == "" {
		writeError(w, http.StatusBadRequest, errMissing("orgId/cohort"))
		return
	}
	contribution := aggregation.Contribution{
		OrgID:  payload.OrgID,
		Cohort: payload.Cohort,
		Share: aggregation.ContributionShare{
			Mask:    payload.Mask,
			Metrics: payload.Metrics,
			Count:   payload.Count,
		},
	}
	if err := s.manager.SubmitContribution(id, contribution); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

func (s *HTTPServer) finalise(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	briefs, err := s.manager.FinaliseExperiment(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, briefs)
}

func (s *HTTPServer) getBrief(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	orgID := chi.URLParam(r, "orgId")
	brief, err := s.manager.GetBrief(id, orgID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, brief)
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func errMissing(field string) error {
	return fmt.Errorf("missing field %s", field)
}
