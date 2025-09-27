package server

import (
	"encoding/json"
	"log"
	"net/http"
	"path/filepath"

	"github.com/summit/sss/pkg/models"
	"github.com/summit/sss/pkg/sarif"
	scanpkg "github.com/summit/sss/pkg/scanner"
)

// ScannerFactory constructs scanners per request to avoid data races.
type ScannerFactory func() *scanpkg.Scanner

// Server exposes HTTP endpoints for running scans.
type Server struct {
	factory ScannerFactory
}

// New creates a new Server.
func New(factory ScannerFactory) *Server {
	return &Server{factory: factory}
}

// Routes returns the http.Handler to mount.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.healthz)
	mux.HandleFunc("/scan", s.scan)
	mux.HandleFunc("/sarif", s.sarif)
	return mux
}

func (s *Server) healthz(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

type scanRequest struct {
	Paths      []string `json:"paths"`
	Quarantine bool     `json:"quarantine"`
	AutoRotate bool     `json:"autoRotate"`
}

type scanResponse struct {
	Findings []models.Finding `json:"findings"`
}

func (s *Server) scan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req scanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(err.Error()))
		return
	}
	if len(req.Paths) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("paths required"))
		return
	}

	instance := s.factory()
	var all []models.Finding
	for _, root := range req.Paths {
		opts := scanpkg.Options{
			Root:             filepath.Clean(root),
			EnableQuarantine: req.Quarantine,
			EnableAutoRotate: req.AutoRotate,
		}
		findings, err := instance.Scan(opts)
		if err != nil {
			log.Printf("scan error: %v", err)
			continue
		}
		all = append(all, findings...)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(scanResponse{Findings: all})
}

type sarifRequest struct {
	Paths      []string `json:"paths"`
	OutputPath string   `json:"outputPath"`
}

type sarifResponse struct {
	Findings int    `json:"findings"`
	Report   string `json:"report"`
}

func (s *Server) sarif(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req sarifRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(err.Error()))
		return
	}
	if len(req.Paths) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("paths required"))
		return
	}
	if req.OutputPath == "" {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("outputPath required"))
		return
	}

	instance := s.factory()
	var all []models.Finding
	for _, root := range req.Paths {
		findings, err := instance.Scan(scanpkg.Options{Root: filepath.Clean(root)})
		if err != nil {
			log.Printf("scan error: %v", err)
			continue
		}
		all = append(all, findings...)
	}

	report := sarif.FromFindings("dev", all)
	if err := report.Write(req.OutputPath); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(err.Error()))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(sarifResponse{Findings: len(all), Report: req.OutputPath})
}
