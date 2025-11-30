package server

import (
	"context"
	"encoding/json"
	"net"

	"github.com/summit/cce/pkg/api"
	"github.com/summit/cce/pkg/grpcstub"
	"github.com/summit/cce/pkg/manager"
)

// jsonCodec emulates gRPC payload serialization with JSON for simplicity.
type jsonCodec struct{}

func (jsonCodec) Marshal(v interface{}) ([]byte, error)      { return json.Marshal(v) }
func (jsonCodec) Unmarshal(data []byte, v interface{}) error { return json.Unmarshal(data, v) }

// Service exposes CCE job execution over the lightweight server.
type Service struct {
	mgr *manager.Manager
	api.UnimplementedRunJobServer
}

func NewService(mgr *manager.Manager) *Service {
	return &Service{mgr: mgr}
}

func (s *Service) RunJob(ctx context.Context, req *api.RunJobRequest) (*api.RunJobResponse, error) {
	result, err := s.mgr.Run(*req)
	if err != nil {
		return nil, err
	}
	return &api.RunJobResponse{
		JobID:        req.Manifest.JobID,
		ResultHash:   result.Hash,
		SealedResult: result.SealedResult,
		AuditToken:   result.AuditToken,
	}, nil
}

// Listen spins up the stub server and binds the RunJob handler.
func Listen(addr string, svc *Service) (*grpcstub.Server, error) {
	server := grpcstub.NewServer()
	api.RegisterRunJobServer(server, svc)
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}
	go server.Serve(lis)
	return server, nil
}
