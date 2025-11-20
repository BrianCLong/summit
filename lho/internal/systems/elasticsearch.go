package systems

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"github.com/summit/lho/internal/model"
)

type Document struct {
	ID        string
	Frozen    bool
	Deleted   bool
	Tags      map[string]string
	Snapshots []map[string]any
	Data      map[string]any
}

type Index struct {
	Name       string
	Docs       map[string]*Document
	RtbBlocked bool
}

type ElasticsearchFixture struct {
	mu      sync.RWMutex
	Indices map[string]*Index
}

func NewElasticsearchFixture(indices map[string]*Index) *ElasticsearchFixture {
	return &ElasticsearchFixture{Indices: indices}
}

func (e *ElasticsearchFixture) Name() string { return "elasticsearch" }

func (e *ElasticsearchFixture) ApplyHold(ctx context.Context, scope model.Scope, freeze, snapshot bool, tags map[string]string, preventTTL bool) (Report, error) {
	select {
	case <-ctx.Done():
		return Report{}, ctx.Err()
	default:
	}

	ids := scope.Systems[e.Name()]
	if len(ids) == 0 {
		return Report{}, nil
	}

	report := Report{Tagged: make(map[string]map[string]string)}

	e.mu.Lock()
	defer e.mu.Unlock()

	for _, composite := range ids {
		indexName, docID, err := splitIndexDoc(composite)
		if err != nil {
			return Report{}, err
		}

		index, ok := e.Indices[indexName]
		if !ok {
			return Report{}, fmt.Errorf("index %s missing", indexName)
		}

		doc, ok := index.Docs[docID]
		if !ok {
			return Report{}, fmt.Errorf("document %s missing", composite)
		}

		if freeze {
			doc.Frozen = true
			report.FrozenResources = append(report.FrozenResources, composite)
		}

		if snapshot {
			clone := make(map[string]any, len(doc.Data))
			for k, v := range doc.Data {
				clone[k] = v
			}
			doc.Snapshots = append(doc.Snapshots, clone)
			report.Snapshotted = append(report.Snapshotted, composite)
		}

		if tags != nil {
			if doc.Tags == nil {
				doc.Tags = make(map[string]string)
			}
			report.Tagged[composite] = make(map[string]string)
			for k, v := range tags {
				doc.Tags[k] = v
				report.Tagged[composite][k] = v
			}
		}

		if preventTTL {
			index.RtbBlocked = true
		}
	}

	report.FingerprintValues = e.fingerprint(ids)

	return report, nil
}

func (e *ElasticsearchFixture) Verify(ctx context.Context, scope model.Scope) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	e.mu.RLock()
	defer e.mu.RUnlock()

	ids := scope.Systems[e.Name()]
	for _, composite := range ids {
		indexName, docID, err := splitIndexDoc(composite)
		if err != nil {
			return err
		}

		index, ok := e.Indices[indexName]
		if !ok {
			return fmt.Errorf("index %s missing", indexName)
		}
		doc, ok := index.Docs[docID]
		if !ok {
			return fmt.Errorf("document %s missing", composite)
		}
		if doc.Deleted {
			return fmt.Errorf("document %s deleted during hold", composite)
		}
		if !doc.Frozen {
			return fmt.Errorf("document %s not frozen", composite)
		}
		if !index.RtbBlocked {
			return fmt.Errorf("index %s rtbf unblocked", indexName)
		}
	}

	return nil
}

func (e *ElasticsearchFixture) DeleteDocument(indexName, docID string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	index, ok := e.Indices[indexName]
	if !ok {
		return fmt.Errorf("index %s not found", indexName)
	}
	doc, ok := index.Docs[docID]
	if !ok {
		return fmt.Errorf("document %s not found", docID)
	}
	if doc.Frozen {
		return fmt.Errorf("document %s frozen under hold", docID)
	}
	doc.Deleted = true
	return nil
}

func (e *ElasticsearchFixture) fingerprint(ids []string) []string {
	parts := make([]string, 0, len(ids))
	for _, composite := range ids {
		indexName, docID, err := splitIndexDoc(composite)
		if err != nil {
			parts = append(parts, fmt.Sprintf("%s:badid", composite))
			continue
		}

		index, ok := e.Indices[indexName]
		if !ok {
			parts = append(parts, fmt.Sprintf("%s:index-missing", composite))
			continue
		}

		doc, ok := index.Docs[docID]
		if !ok {
			parts = append(parts, fmt.Sprintf("%s:doc-missing", composite))
			continue
		}

		parts = append(parts, fmt.Sprintf("%s:%t:%t:%t", composite, doc.Frozen, doc.Deleted, index.RtbBlocked))
	}
	sort.Strings(parts)
	return parts
}

func splitIndexDoc(input string) (string, string, error) {
	for i := 0; i < len(input); i++ {
		if input[i] == '/' {
			return input[:i], input[i+1:], nil
		}
	}
	return "", "", fmt.Errorf("invalid elasticsearch identifier %s", input)
}
