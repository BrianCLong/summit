package grpcstub

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"time"
)

// Handler is invoked for JSON encoded requests.
type Handler func(ctx context.Context, body []byte) ([]byte, error)

// Server provides a minimal gRPC-like JSON transport to avoid external deps.
type Server struct {
	mux      *http.ServeMux
	handlers map[string]Handler
}

// NewServer constructs the lightweight server.
func NewServer() *Server {
	return &Server{
		mux:      http.NewServeMux(),
		handlers: make(map[string]Handler),
	}
}

// RegisterJSONHandler registers a path handler.
func (s *Server) RegisterJSONHandler(path string, h Handler) {
	s.handlers[path] = h
	s.mux.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "unable to read request", http.StatusBadRequest)
			return
		}
		ctx := r.Context()
		buf, err := h(ctx, body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(buf); err != nil {
			log.Printf("failed to write response: %v", err)
		}
	})
}

// Serve starts the HTTP server on the given listener.
func (s *Server) Serve(l net.Listener) error {
	srv := &http.Server{Handler: s.mux, ReadHeaderTimeout: 5 * time.Second}
	return srv.Serve(l)
}

// Marshal encodes value as JSON.
func Marshal(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

// Unmarshal decodes JSON payload.
func Unmarshal(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}
