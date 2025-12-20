package systems

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"github.com/summit/lho/internal/model"
)

type Row struct {
	PrimaryKey string
	Frozen     bool
	Deleted    bool
	Data       map[string]any
}

type Table struct {
	Name string
	Rows map[string]*Row
}

type PostgresFixture struct {
	mu     sync.RWMutex
	Tables map[string]*Table
}

func NewPostgresFixture(tables map[string]*Table) *PostgresFixture {
	return &PostgresFixture{Tables: tables}
}

func (p *PostgresFixture) Name() string { return "postgres" }

func (p *PostgresFixture) ApplyHold(ctx context.Context, scope model.Scope, freeze, snapshot bool, tags map[string]string, preventTTL bool) (Report, error) {
	select {
	case <-ctx.Done():
		return Report{}, ctx.Err()
	default:
	}

	ids := scope.Systems[p.Name()]
	if len(ids) == 0 {
		return Report{}, nil
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	report := Report{}
	for _, composite := range ids {
		tableName, rowID, err := splitCompositeID(composite)
		if err != nil {
			return Report{}, err
		}

		table, ok := p.Tables[tableName]
		if !ok {
			return Report{}, fmt.Errorf("table %s not found", tableName)
		}

		row, ok := table.Rows[rowID]
		if !ok {
			return Report{}, fmt.Errorf("row %s missing", rowID)
		}

		if freeze {
			row.Frozen = true
			report.FrozenResources = append(report.FrozenResources, composite)
		}
	}

	report.FingerprintValues = p.fingerprint(ids)

	return report, nil
}

func (p *PostgresFixture) Verify(ctx context.Context, scope model.Scope) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	p.mu.RLock()
	defer p.mu.RUnlock()

	ids := scope.Systems[p.Name()]
	for _, composite := range ids {
		tableName, rowID, err := splitCompositeID(composite)
		if err != nil {
			return err
		}
		table, ok := p.Tables[tableName]
		if !ok {
			return fmt.Errorf("table %s missing during verification", tableName)
		}
		row, ok := table.Rows[rowID]
		if !ok {
			return fmt.Errorf("row %s missing during verification", rowID)
		}
		if row.Deleted {
			return fmt.Errorf("row %s deleted during hold", rowID)
		}
		if !row.Frozen {
			return fmt.Errorf("row %s not frozen", rowID)
		}
	}

	return nil
}

func (p *PostgresFixture) DeleteRow(tableName, rowID string) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	table, ok := p.Tables[tableName]
	if !ok {
		return fmt.Errorf("table %s not found", tableName)
	}

	row, ok := table.Rows[rowID]
	if !ok {
		return fmt.Errorf("row %s not found", rowID)
	}

	if row.Frozen {
		return fmt.Errorf("row %s is frozen under legal hold", rowID)
	}

	row.Deleted = true
	return nil
}

func (p *PostgresFixture) fingerprint(ids []string) []string {
	parts := make([]string, 0, len(ids))
	for _, composite := range ids {
		tableName, rowID, err := splitCompositeID(composite)
		if err != nil {
			parts = append(parts, fmt.Sprintf("%s:badid", composite))
			continue
		}
		table, ok := p.Tables[tableName]
		if !ok {
			parts = append(parts, fmt.Sprintf("%s:table-missing", composite))
			continue
		}
		row, ok := table.Rows[rowID]
		if !ok {
			parts = append(parts, fmt.Sprintf("%s:row-missing", composite))
			continue
		}
		parts = append(parts, fmt.Sprintf("%s:%t:%t", composite, row.Frozen, row.Deleted))
	}
	sort.Strings(parts)
	return parts
}

func splitCompositeID(input string) (string, string, error) {
	for i := 0; i < len(input); i++ {
		if input[i] == '/' {
			return input[:i], input[i+1:], nil
		}
	}
	return "", "", fmt.Errorf("composite identifier %s missing separator", input)
}
