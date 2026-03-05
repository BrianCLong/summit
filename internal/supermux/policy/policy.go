package policy

import (
	"fmt"
	pkg "supermux/pkg/supermux"
)

type Resource string

const (
	Network    Resource = "network"
	Filesystem Resource = "filesystem"
	Subprocess Resource = "subprocess"
)

type Profile struct {
	Allow NetworkPolicy `json:"allow"`
}

type NetworkPolicy struct {
	Network    bool `json:"network"`
	Filesystem bool `json:"filesystem"`
}

type Engine struct {
	profiles map[pkg.RunID]Profile
}

func NewEngine() *Engine {
	return &Engine{
		profiles: make(map[pkg.RunID]Profile),
	}
}

func (e *Engine) LoadProfile(run pkg.RunID, p Profile) {
	e.profiles[run] = p
}

func (e *Engine) Check(run pkg.RunID, res Resource) error {
	profile, exists := e.profiles[run]
	if !exists {
		// Deny by default if no profile
		return fmt.Errorf("deny-by-default: run %s has no profile for %s", run, res)
	}

	switch res {
	case Network:
		if !profile.Allow.Network {
			return fmt.Errorf("deny-by-default: network access restricted")
		}
	case Filesystem:
		if !profile.Allow.Filesystem {
			return fmt.Errorf("deny-by-default: filesystem access restricted")
		}
	default:
		return fmt.Errorf("deny-by-default: resource %s restricted", res)
	}

	return nil
}
