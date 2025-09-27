package policy

import "sync"

type Store struct {
	mu     sync.RWMutex
	policy Policy
}

func NewStore() *Store {
	return &Store{policy: Policy{Flags: map[string]Flag{}}}
}

func (s *Store) Get() Policy {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.policy.Copy()
}

func (s *Store) Set(p Policy) {
	s.mu.Lock()
	defer s.mu.Unlock()
	copied := Policy{Flags: make(map[string]Flag, len(p.Flags))}
	for k, v := range p.Flags {
		if v.Rollout.Percentage == 0 {
			v.Rollout = DefaultRollout()
		}
		copied.Flags[k] = v
	}
	s.policy = copied
}
