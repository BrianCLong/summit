package server

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"qawe/internal/engine"
)

// API wires HTTP endpoints to the workflow engine.
type API struct {
	Engine *engine.Engine
	pubKey ed25519.PublicKey
}

// New creates an API handler.
func New(e *engine.Engine, pub ed25519.PublicKey) *API {
	return &API{Engine: e, pubKey: pub}
}

// Handler exposes the API routes.
func (a *API) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/info", a.handleInfo)
	mux.HandleFunc("/api/workflows", a.handleWorkflows)
	mux.HandleFunc("/api/instances", a.handleInstances)
	mux.HandleFunc("/api/instances/", a.handleInstanceByID)
	return withJSONHeaders(mux)
}

func (a *API) handleInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}
	response := map[string]string{
		"serverPublicKey": base64.StdEncoding.EncodeToString(a.pubKey),
	}
	writeJSON(w, http.StatusOK, response)
}

func (a *API) handleWorkflows(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}
	var def engine.WorkflowDefinition
	if err := json.NewDecoder(r.Body).Decode(&def); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	created, err := a.Engine.CreateWorkflow(def)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (a *API) handleInstances(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}
	var req engine.StartInstanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	instance, err := a.Engine.StartInstance(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, instance)
}

func (a *API) handleInstanceByID(w http.ResponseWriter, r *http.Request) {
	segments := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/instances/"), "/")
	if len(segments) == 0 || segments[0] == "" {
		writeError(w, http.StatusNotFound, errors.New("missing instance id"))
		return
	}
	instanceID := segments[0]
	if len(segments) == 1 {
		switch r.Method {
		case http.MethodGet:
			instance, err := a.Engine.GetInstance(instanceID)
			if err != nil {
				writeError(w, http.StatusNotFound, err)
				return
			}
			writeJSON(w, http.StatusOK, instance)
		default:
			writeError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		}
		return
	}
	if len(segments) == 2 && segments[1] == "approvals" {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
			return
		}
		var req engine.SubmitApprovalRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		bundle, err := a.Engine.SubmitApproval(instanceID, req)
		if err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		if bundle == nil {
			writeJSON(w, http.StatusAccepted, map[string]string{"status": "recorded"})
			return
		}
		writeJSON(w, http.StatusCreated, bundle)
		return
	}
	writeError(w, http.StatusNotFound, errors.New("unknown path"))
}

func withJSONHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, err error) {
	type errorResponse struct {
		Error string `json:"error"`
	}
	writeJSON(w, status, errorResponse{Error: err.Error()})
}
