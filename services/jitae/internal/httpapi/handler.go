package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/summit/jitae/internal/audit"
	"github.com/summit/jitae/internal/core"
)

// NewHandler wires HTTP routes for the JITAE service.
func NewHandler(svc *core.Service, auditor *audit.Manager) http.Handler {
	h := &handler{service: svc, auditor: auditor}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", h.handleHealth)
	mux.HandleFunc("/templates", h.handleTemplates)
	mux.HandleFunc("/requests", h.handleRequests)
	mux.HandleFunc("/requests/", h.handleRequestAction)
	mux.HandleFunc("/audit/events", h.handleAuditEvents)
	mux.HandleFunc("/audit/public-key", h.handlePublicKey)
	return mux
}

type handler struct {
	service *core.Service
	auditor *audit.Manager
}

func (h *handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *handler) handleTemplates(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		templates := h.service.ListTemplates()
		writeJSON(w, http.StatusOK, templates)
	case http.MethodPost:
		var payload struct {
			Name        string   `json:"name"`
			Description string   `json:"description"`
			Scopes      []string `json:"scopes"`
			TTLSeconds  int64    `json:"ttlSeconds"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON payload")
			return
		}
		if payload.TTLSeconds <= 0 {
			writeError(w, http.StatusBadRequest, "ttlSeconds must be positive")
			return
		}
		tpl, err := h.service.CreateTemplate(r.Context(), core.Template{
			Name:        payload.Name,
			Description: payload.Description,
			Scopes:      payload.Scopes,
			TTL:         time.Duration(payload.TTLSeconds) * time.Second,
		})
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, tpl)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *handler) handleRequests(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		requests := h.service.ListRequests()
		writeJSON(w, http.StatusOK, requests)
	case http.MethodPost:
		var payload struct {
			TemplateID string `json:"templateId"`
			Requestor  string `json:"requestorId"`
			Purpose    string `json:"purpose"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON payload")
			return
		}
		req, err := h.service.CreateRequest(r.Context(), payload.TemplateID, payload.Requestor, payload.Purpose)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, req)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *handler) handleRequestAction(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.URL.Path, "/requests/") {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/requests/")
	if strings.HasSuffix(id, "/approve") {
		id = strings.TrimSuffix(id, "/approve")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			Approver string `json:"approverId"`
			Comment  string `json:"comment"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON payload")
			return
		}
		req, err := h.service.ApproveRequest(r.Context(), id, payload.Approver, payload.Comment)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, req)
		return
	}

	if r.Method == http.MethodGet {
		req, err := h.service.GetRequest(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, req)
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func (h *handler) handleAuditEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if h.auditor == nil {
		writeJSON(w, http.StatusOK, []audit.Event{})
		return
	}
	writeJSON(w, http.StatusOK, h.auditor.Events())
}

func (h *handler) handlePublicKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if h.auditor == nil {
		writeError(w, http.StatusServiceUnavailable, "audit manager not configured")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"publicKey": h.auditor.PublicKeyHex()})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
