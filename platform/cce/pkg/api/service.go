package api

import (
	"context"
	"errors"

	"github.com/summit/cce/pkg/grpcstub"
)

// RunJobServer mirrors the generated interface for the RunJob endpoint.
type RunJobServer interface {
	RunJob(context.Context, *RunJobRequest) (*RunJobResponse, error)
}

// UnimplementedRunJobServer provides forward compatibility.
type UnimplementedRunJobServer struct{}

func (UnimplementedRunJobServer) RunJob(context.Context, *RunJobRequest) (*RunJobResponse, error) {
	return nil, errors.New("method RunJob not implemented")
}

// RegisterRunJobServer wires the handler into the lightweight gRPC stub.
func RegisterRunJobServer(s grpcstub.ServiceRegistrar, srv RunJobServer) {
	s.RegisterService(&grpcstub.ServiceDesc{
		ServiceName: "cce.RunJob",
		HandlerType: (*RunJobServer)(nil),
		Methods: []grpcstub.MethodDesc{
			{
				MethodName: "runJob",
				Handler: func(srv interface{}, ctx context.Context, dec func(interface{}) error) (interface{}, error) {
					in := new(RunJobRequest)
					if err := dec(in); err != nil {
						return nil, err
					}
					return srv.(RunJobServer).RunJob(ctx, in)
				},
			},
		},
	}, srv)
}
