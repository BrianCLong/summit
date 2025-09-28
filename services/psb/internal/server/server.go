package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/summit/psb/internal/files"
	"github.com/summit/psb/internal/model"
	"github.com/summit/psb/internal/sampler"
	"github.com/summit/psb/internal/verifier"
)

type Config struct {
	DatasetPath    string
	PrivateKeyPath string
}

type Server struct {
	dataset model.Dataset
	sampler *sampler.Sampler
}

func New(cfg Config) (*Server, error) {
	if cfg.DatasetPath == "" {
		return nil, errors.New("dataset path is required")
	}
	if cfg.PrivateKeyPath == "" {
		return nil, errors.New("private key path is required")
	}
	dataset, err := files.LoadDataset(cfg.DatasetPath)
	if err != nil {
		return nil, err
	}
	priv, err := files.LoadPrivateKey(cfg.PrivateKeyPath)
	if err != nil {
		return nil, err
	}
	samplerSvc, err := sampler.New(dataset, priv)
	if err != nil {
		return nil, err
	}
	return &Server{dataset: dataset, sampler: samplerSvc}, nil
}

func (s *Server) Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/sample", s.handleSample)
	mux.HandleFunc("/verify", s.handleVerify)
	return mux
}

func (s *Server) handleSample(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	var req model.SamplingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("invalid request: %v", err), http.StatusBadRequest)
		return
	}
	resp, err := s.sampler.Sample(req)
	if err != nil {
		http.Error(w, fmt.Sprintf("sampling error: %v", err), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleVerify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()
	var cert model.SamplingCertificate
	if err := json.NewDecoder(r.Body).Decode(&cert); err != nil {
		http.Error(w, fmt.Sprintf("invalid certificate payload: %v", err), http.StatusBadRequest)
		return
	}
	result, err := verifier.Verify(cert, s.dataset)
	if err != nil {
		http.Error(w, fmt.Sprintf("verification failed: %v", err), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
