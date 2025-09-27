package alsp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// Storage abstracts persistence for compressed blocks.
type Storage interface {
	SaveBlock(ctx context.Context, block Block) error
	BlockByIndex(ctx context.Context, index uint64) (Block, error)
	LatestBlock(ctx context.Context) (Block, error)
	BlocksInRange(ctx context.Context, start, end uint64) ([]Block, error)
}

// InMemoryStorage provides a deterministic adapter for tests and
// demonstrations.
type InMemoryStorage struct {
	mu     sync.RWMutex
	blocks map[uint64]Block
}

func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{blocks: make(map[uint64]Block)}
}

func (s *InMemoryStorage) SaveBlock(_ context.Context, block Block) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.blocks[block.Index] = block
	return nil
}

func (s *InMemoryStorage) BlockByIndex(_ context.Context, index uint64) (Block, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	block, ok := s.blocks[index]
	if !ok {
		return Block{}, ErrBlockNotFound
	}
	return block, nil
}

func (s *InMemoryStorage) LatestBlock(_ context.Context) (Block, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.blocks) == 0 {
		return Block{}, ErrBlockNotFound
	}
	var max uint64
	for idx := range s.blocks {
		if idx > max {
			max = idx
		}
	}
	return s.blocks[max], nil
}

func (s *InMemoryStorage) BlocksInRange(_ context.Context, start, end uint64) ([]Block, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []Block
	for i := start; i <= end; i++ {
		block, ok := s.blocks[i]
		if ok {
			out = append(out, block)
		}
	}
	if len(out) == 0 {
		return nil, ErrBlockNotFound
	}
	return out, nil
}

// FileStorage persists blocks as JSON documents under the provided directory.
type FileStorage struct {
	root string
	mu   sync.Mutex
}

func NewFileStorage(root string) (*FileStorage, error) {
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	return &FileStorage{root: root}, nil
}

func (s *FileStorage) SaveBlock(_ context.Context, block Block) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, err := json.MarshalIndent(block, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(s.root, formatBlockFilename(block.Index)), data, 0o644)
}

func (s *FileStorage) BlockByIndex(_ context.Context, index uint64) (Block, error) {
	data, err := os.ReadFile(filepath.Join(s.root, formatBlockFilename(index)))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Block{}, ErrBlockNotFound
		}
		return Block{}, err
	}
	var block Block
	if err := json.Unmarshal(data, &block); err != nil {
		return Block{}, err
	}
	return block, nil
}

func (s *FileStorage) LatestBlock(ctx context.Context) (Block, error) {
	entries, err := os.ReadDir(s.root)
	if err != nil {
		return Block{}, err
	}
	if len(entries) == 0 {
		return Block{}, ErrBlockNotFound
	}
	var max uint64
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		var idx uint64
		_, scanErr := fmt.Sscanf(entry.Name(), "block-%d.json", &idx)
		if scanErr == nil && idx >= max {
			max = idx
		}
	}
	if max == 0 {
		return Block{}, ErrBlockNotFound
	}
	return s.BlockByIndex(ctx, max)
}

func (s *FileStorage) BlocksInRange(ctx context.Context, start, end uint64) ([]Block, error) {
	var out []Block
	for i := start; i <= end; i++ {
		block, err := s.BlockByIndex(ctx, i)
		if err == nil {
			out = append(out, block)
		}
	}
	if len(out) == 0 {
		return nil, ErrBlockNotFound
	}
	return out, nil
}

func formatBlockFilename(index uint64) string {
	return fmt.Sprintf("block-%06d.json", index)
}
