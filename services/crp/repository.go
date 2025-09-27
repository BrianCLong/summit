package crp

import "sync"

// Repository tracks processed events to guarantee idempotent replays.
type Repository interface {
	Get(id string) (PropagationResult, bool)
	Save(id string, result PropagationResult)
}

// MemoryRepository is an in-memory implementation suitable for unit tests
// and lightweight deployments.
type MemoryRepository struct {
	mu    sync.RWMutex
	items map[string]PropagationResult
}

// NewMemoryRepository initialises a fresh repository instance.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{items: make(map[string]PropagationResult)}
}

// Get retrieves a previously stored result, if any.
func (r *MemoryRepository) Get(id string) (PropagationResult, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result, ok := r.items[id]
	return result, ok
}

// Save writes or overwrites an event result.
func (r *MemoryRepository) Save(id string, result PropagationResult) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.items[id] = result
}
