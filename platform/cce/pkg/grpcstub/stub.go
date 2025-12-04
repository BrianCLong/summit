package grpcstub

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
)

type MethodHandler func(srv interface{}, ctx context.Context, dec func(interface{}) error) (interface{}, error)

type MethodDesc struct {
	MethodName string
	Handler    MethodHandler
}

type ServiceDesc struct {
	ServiceName string
	HandlerType interface{}
	Methods     []MethodDesc
}

type ServiceRegistrar interface {
	RegisterService(*ServiceDesc, interface{})
}

type Server struct {
	mux *http.ServeMux
}

func NewServer() *Server {
	return &Server{mux: http.NewServeMux()}
}

func (s *Server) RegisterService(desc *ServiceDesc, impl interface{}) {
	for _, m := range desc.Methods {
		handler := m.Handler
		s.mux.HandleFunc("/"+m.MethodName, func(w http.ResponseWriter, r *http.Request) {
			in := map[string]interface{}{}
			_ = json.NewDecoder(r.Body).Decode(&in)
			result, err := handler(impl, r.Context(), func(target interface{}) error {
				b, _ := json.Marshal(in)
				return json.Unmarshal(b, target)
			})
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
				return
			}
			_ = json.NewEncoder(w).Encode(result)
		})
	}
}

func (s *Server) Serve(lis net.Listener) error {
	return http.Serve(lis, s.mux)
}

func (s *Server) Stop() {}
