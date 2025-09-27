package ccmo

import (
	"encoding/json"
	"net/http"
)

// Server exposes CCMO functionality over HTTP.
type Server struct {
	service *Service
}

// NewServer constructs the HTTP server wrapper.
func NewServer(service *Service) *Server {
	return &Server{service: service}
}

// Routes wires handlers onto the provided mux.
func (s *Server) Routes(mux *http.ServeMux) {
	mux.HandleFunc("/healthz", s.health)
	mux.HandleFunc("/consents", s.handleConsents)
	mux.HandleFunc("/notifications/send", s.handleSend)
	mux.HandleFunc("/appeals", s.handleAppeals)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func (s *Server) handleConsents(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var payload struct {
			SubjectID string   `json:"subjectId"`
			Topic     string   `json:"topic"`
			Purpose   string   `json:"purpose"`
			Allowed   bool     `json:"allowed"`
			Locales   []string `json:"locales"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		locales := make(map[string]bool)
		for _, locale := range payload.Locales {
			locales[normaliseLocale(locale)] = true
		}
		s.service.SetConsent(payload.SubjectID, payload.Topic, payload.Purpose, ConsentRecord{Allowed: payload.Allowed, Locales: locales})
		w.WriteHeader(http.StatusCreated)
		return
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleSend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var payload NotificationRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	payload.Locale = normaliseLocale(payload.Locale)
	resp, err := s.service.Send(payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	status := http.StatusOK
	if resp.Status == "blocked" {
		status = http.StatusAccepted
	}
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(resp)
}

func (s *Server) handleAppeals(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	entries := s.service.Appeals()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(entries)
}
