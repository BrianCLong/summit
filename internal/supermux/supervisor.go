package supermux

import (
	"fmt"
	"os"
	pkg "supermux/pkg/supermux"
)

func IsEnabled() bool {
	return os.Getenv("SUMMIT_FEATURE_SUPERMUX") == "1"
}

type SessionSpec struct {
	Name    string
	Command string
	Args    []string
}

type Supervisor struct {
	reg *Registry
	run pkg.RunID
}

func NewSupervisor(run pkg.RunID) *Supervisor {
	return &Supervisor{
		reg: NewRegistry(),
		run: run,
	}
}

func (s *Supervisor) StartSession(spec SessionSpec) (pkg.SessionID, error) {
	if !IsEnabled() {
		return "", fmt.Errorf("supermux is disabled by default")
	}

	id := pkg.NewSessionID(s.run, spec.Name)
	s.reg.Register(id, spec.Name)

	// Simulate start
	s.reg.UpdateStatus(id, StatusRunning)
	return id, nil
}

func (s *Supervisor) StopSession(id pkg.SessionID) error {
	if !IsEnabled() {
		return fmt.Errorf("supermux is disabled by default")
	}

	return s.reg.UpdateStatus(id, StatusStopped)
}

func (s *Supervisor) ListSessions() []SessionInfo {
	return s.reg.List()
}
