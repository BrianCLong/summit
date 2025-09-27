package main

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type estimateRequest struct {
	JobID     string        `json:"jobId"`
	Region    string        `json:"region"`
	Resources ResourceUsage `json:"resources"`
}

type actualRequest struct {
	JobID     string        `json:"jobId"`
	Region    string        `json:"region"`
	Resources ResourceUsage `json:"resources"`
}

type budgetCheckRequest struct {
	JobID     string        `json:"jobId"`
	Region    string        `json:"region"`
	Resources ResourceUsage `json:"resources"`
	BudgetUSD float64       `json:"budgetUsd"`
}

type budgetCheckResponse struct {
	JobID        string  `json:"jobId"`
	Region       string  `json:"region"`
	BudgetUSD    float64 `json:"budgetUsd"`
	ProjectedUSD float64 `json:"projectedUsd"`
	ProjectedKg  float64 `json:"projectedCarbonKg"`
	Allowed      bool    `json:"allowed"`
	MarginUSD    float64 `json:"marginUsd"`
	ModelVersion string  `json:"modelVersion"`
	ErrorMargin  float64 `json:"errorMargin"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// Router wires the q3c handlers into a chi router instance.
func Router(model *ResourceModel, store *JobStore) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/v1/report/{jobId}", func(w http.ResponseWriter, r *http.Request) {
		jobID := chi.URLParam(r, "jobId")
		record, ok := store.Get(jobID)
		if !ok {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "job not found"})
			return
		}
		writeJSON(w, http.StatusOK, record)
	})

	r.Post("/v1/estimate", func(w http.ResponseWriter, r *http.Request) {
		var req estimateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}
		if req.JobID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "jobId is required"})
			return
		}
		estimate, err := model.Estimate(req.Region, req.Resources)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
			return
		}
		record := store.SaveProjection(req.JobID, req.Region, req.Resources, estimate)
		writeJSON(w, http.StatusOK, record)
	})

	r.Post("/v1/actual", func(w http.ResponseWriter, r *http.Request) {
		var req actualRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}
		if req.JobID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "jobId is required"})
			return
		}
		record, err := store.ApplyActual(req.JobID, req.Region, req.Resources, model)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, record)
	})

	r.Post("/v1/budget/check", func(w http.ResponseWriter, r *http.Request) {
		var req budgetCheckRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}
		if req.JobID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "jobId is required"})
			return
		}
		estimate, err := model.Estimate(req.Region, req.Resources)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
			return
		}
		margin := req.BudgetUSD - estimate.CostUSD
		allowed := margin >= 0
		record := store.SaveProjection(req.JobID, req.Region, req.Resources, estimate)

		resp := budgetCheckResponse{
			JobID:        req.JobID,
			Region:       req.Region,
			BudgetUSD:    req.BudgetUSD,
			ProjectedUSD: estimate.CostUSD,
			ProjectedKg:  estimate.CarbonKg,
			Allowed:      allowed,
			MarginUSD:    margin,
			ModelVersion: estimate.ModelVersion,
			ErrorMargin:  estimate.ErrorMargin,
		}
		if !allowed {
			writeJSON(w, http.StatusForbidden, resp)
			return
		}
		writeJSON(w, http.StatusOK, struct {
			budgetCheckResponse
			Projection JobRecord `json:"projection"`
		}{budgetCheckResponse: resp, Projection: record})
	})

	return r
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
