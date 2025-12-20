package storage

import (
	"context"
	"fmt"
	"path"
	"strings"
)

// Object represents an item stored in object storage.
type Object struct {
	Key       string
	Size      int64
	UpdatedAt int64
}

// ObjectStore exposes operations required by retentiond to enforce TTLs in S3.
type ObjectStore interface {
	ListExpired(ctx context.Context, bucket, prefix string, cutoff int64) ([]Object, error)
	Delete(ctx context.Context, bucket string, keys []string) error
	PlanLifecycle(ctx context.Context, bucket string, prefix string, days int) error
}

// Database represents the subset of Postgres functionality retentiond relies on.
type Database interface {
	ListExpired(ctx context.Context, table, timestampColumn, filter string, keyColumns []string, cutoff int64) ([]Row, error)
	Delete(ctx context.Context, table string, rows []Row, keyColumns []string) error
	EnsureTTL(ctx context.Context, table, timestampColumn string, retainFor string) error
}

// Row holds primary key identifiers for expired rows.
type Row struct {
	Keys map[string]string
}

// EnforceTenantPrefix ensures an object storage prefix is namespaced by a tenant.
func EnforceTenantPrefix(prefix, tenant string) (string, error) {
	if tenant == "" {
		return "", fmt.Errorf("tenant must be provided for object storage prefixes")
	}
	cleanPrefix := strings.TrimPrefix(prefix, "/")
	if cleanPrefix == "" {
		return path.Join(tenant, "/"), nil
	}
	if strings.HasPrefix(cleanPrefix, tenant+"/") || cleanPrefix == tenant {
		return cleanPrefix, nil
	}
	return path.Join(tenant, cleanPrefix), nil
}
