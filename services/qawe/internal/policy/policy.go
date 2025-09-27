package policy

import (
	"encoding/base64"
	"errors"
)

// Policy defines the set of roles and eligible voters that can participate in
// workflow approvals.
type Policy struct {
	Roles map[string]*Role `json:"roles"`
}

// Role describes a named collection of principals who can vote on a gate.
type Role struct {
	ID         string       `json:"id"`
	Name       string       `json:"name"`
	Principals []*Principal `json:"principals"`
}

// Principal is a primary voter that may optionally delegate authority to
// alternate actors.
type Principal struct {
	ID        string      `json:"id"`
	Display   string      `json:"display"`
	PublicKey string      `json:"publicKey"`
	Delegates []*Delegate `json:"delegates,omitempty"`
}

// Delegate is an alternate voter acting on behalf of a principal.
type Delegate struct {
	ID        string `json:"id"`
	Display   string `json:"display"`
	PublicKey string `json:"publicKey"`
}

// ResolveActor validates that the provided actor is permitted to cast a vote
// for the given role. It returns the canonical principal that the vote counts
// towards, the actor that is signing, and the actor's public key.
func (p *Policy) ResolveActor(roleID, actorID, delegatedFrom string) (*Principal, string, []byte, error) {
	if p == nil {
		return nil, "", nil, errors.New("policy not configured")
	}
	role, ok := p.Roles[roleID]
	if !ok {
		return nil, "", nil, errors.New("role not found")
	}
	for _, principal := range role.Principals {
		if delegatedFrom != "" && principal.ID != delegatedFrom {
			continue
		}
		if principal.ID == actorID {
			pub, err := decodeKey(principal.PublicKey)
			return principal, principal.ID, pub, err
		}
		for _, delegate := range principal.Delegates {
			if delegate.ID != actorID {
				continue
			}
			pub, err := decodeKey(delegate.PublicKey)
			return principal, delegate.ID, pub, err
		}
	}
	return nil, "", nil, errors.New("actor not authorized for role")
}

func decodeKey(key string) ([]byte, error) {
	if key == "" {
		return nil, errors.New("missing public key")
	}
	bytes, err := base64.StdEncoding.DecodeString(key)
	if err != nil {
		return nil, err
	}
	return bytes, nil
}

// PrincipalByID fetches a principal by ID.
func (r *Role) PrincipalByID(id string) *Principal {
	for _, principal := range r.Principals {
		if principal.ID == id {
			return principal
		}
	}
	return nil
}

// DelegateKey returns the public key for the named delegate if it exists.
func (p *Principal) DelegateKey(delegateID string) (string, bool) {
	for _, delegate := range p.Delegates {
		if delegate.ID == delegateID {
			return delegate.PublicKey, true
		}
	}
	return "", false
}

// Validate ensures the policy definition is internally consistent.
func (p *Policy) Validate() error {
	if p == nil {
		return errors.New("policy is nil")
	}
	if len(p.Roles) == 0 {
		return errors.New("policy must define at least one role")
	}
	for id, role := range p.Roles {
		if role == nil {
			return errors.New("role " + id + " is nil")
		}
		if len(role.Principals) == 0 {
			return errors.New("role " + id + " has no principals")
		}
		for _, principal := range role.Principals {
			if _, err := decodeKey(principal.PublicKey); err != nil {
				return err
			}
			for _, delegate := range principal.Delegates {
				if _, err := decodeKey(delegate.PublicKey); err != nil {
					return err
				}
			}
		}
	}
	return nil
}
