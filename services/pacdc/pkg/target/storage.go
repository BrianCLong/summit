package target

import (
	"fmt"
	"sync"

	"github.com/summit/pacdc/pkg/config"
	"github.com/summit/pacdc/pkg/replicator"
)

// tableStorage maintains per-stream data keyed by primary key.
type tableStorage struct {
	mu     sync.Mutex
	tables map[string]map[string]map[string]any
}

func newTableStorage() *tableStorage {
	return &tableStorage{tables: make(map[string]map[string]map[string]any)}
}

func (s *tableStorage) applySnapshot(stream config.StreamConfig, rows []map[string]any) {
	s.mu.Lock()
	defer s.mu.Unlock()
	table := make(map[string]map[string]any, len(rows))
	for _, row := range rows {
		key := buildKey(stream, row)
		if key == "" {
			// Skip rows that do not contain a complete primary key.
			continue
		}
		table[key] = cloneRow(row)
	}
	s.tables[stream.Name] = table
}

func (s *tableStorage) applyChange(stream config.StreamConfig, evt replicator.ChangeEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	table := s.tables[stream.Name]
	if table == nil {
		table = make(map[string]map[string]any)
		s.tables[stream.Name] = table
	}
	switch evt.Type {
	case replicator.ChangeTypeInsert, replicator.ChangeTypeUpdate:
		key := buildKey(stream, evt.NewValues)
		if key == "" {
			return fmt.Errorf("missing primary key for stream %s", stream.Name)
		}
		table[key] = cloneRow(evt.NewValues)
	case replicator.ChangeTypeDelete:
		key := buildKey(stream, evt.OldValues)
		if key == "" {
			return fmt.Errorf("missing primary key for stream %s", stream.Name)
		}
		delete(table, key)
	}
	return nil
}

func (s *tableStorage) export(stream string) []map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()
	table := s.tables[stream]
	rows := make([]map[string]any, 0, len(table))
	for _, row := range table {
		rows = append(rows, cloneRow(row))
	}
	return rows
}

func buildKey(stream config.StreamConfig, row map[string]any) string {
	if len(stream.PrimaryKey) == 0 {
		return ""
	}
	key := ""
	for idx, column := range stream.PrimaryKey {
		value, ok := row[column]
		if !ok {
			return ""
		}
		if idx > 0 {
			key += "|"
		}
		key += fmt.Sprintf("%v", value)
	}
	return key
}

func cloneRow(row map[string]any) map[string]any {
	out := make(map[string]any, len(row))
	for k, v := range row {
		out[k] = v
	}
	return out
}
