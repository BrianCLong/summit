package supermux

import (
	"sync"
	"fmt"
	pkg "supermux/pkg/supermux"
)

type SessionStatus string

const (
	StatusStarting SessionStatus = "STARTING"
	StatusRunning  SessionStatus = "RUNNING"
	StatusStopped  SessionStatus = "STOPPED"
	StatusFailed   SessionStatus = "FAILED"
)

type SessionInfo struct {
	ID     pkg.SessionID
	Name   string
	Status SessionStatus
}

type Registry struct {
	mu       sync.RWMutex
	sessions map[pkg.SessionID]*SessionInfo
}

func NewRegistry() *Registry {
	return &Registry{
		sessions: make(map[pkg.SessionID]*SessionInfo),
	}
}

func (r *Registry) Register(id pkg.SessionID, name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.sessions[id] = &SessionInfo{ID: id, Name: name, Status: StatusStarting}
}

func (r *Registry) UpdateStatus(id pkg.SessionID, status SessionStatus) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if session, exists := r.sessions[id]; exists {
		session.Status = status
		return nil
	}
	return fmt.Errorf("session %s not found", id)
}

func (r *Registry) List() []SessionInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []SessionInfo
	for _, session := range r.sessions {
		list = append(list, *session)
	}
	return list
}
