package store

import (
	"context"

	"example.com/summit/fcs/internal/model"
)

// Store abstracts a federated data store capable of holding canary records.
type Store interface {
	Type() model.StoreKind
	Put(ctx context.Context, canary model.StoredCanary) error
	List(ctx context.Context) ([]model.StoredCanary, error)
}
