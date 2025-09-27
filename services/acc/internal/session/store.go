package session

import "sync"

type State struct {
	Replica    string
	LastWriteN int64
}

type Store struct {
	mu       sync.RWMutex
	sessions map[string]State
	counter  int64
}

func NewStore() *Store {
	return &Store{sessions: make(map[string]State)}
}

func (s *Store) RecordWrite(sessionID, replica string) State {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counter++
	state := State{Replica: replica, LastWriteN: s.counter}
	s.sessions[sessionID] = state
	return state
}

func (s *Store) Last(sessionID string) (State, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	state, ok := s.sessions[sessionID]
	return state, ok
}

func (s *Store) Clear(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, sessionID)
}
