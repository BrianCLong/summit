package challenge

import "fmt"

// VerificationInput represents user supplied data used to satisfy a challenge.
type VerificationInput map[string]string

// Challenge describes an additional verification step required to elevate trust.
type Challenge interface {
	Type() string
	Prompt() string
	Verify(input VerificationInput) error
}

// Info describes a challenge presented back to clients.
type Info struct {
	Type   string `json:"type"`
	Prompt string `json:"prompt"`
}

// Registry stores challenge implementations keyed by their type.
type Registry struct {
	entries map[string]Challenge
}

// NewRegistry constructs a registry from the provided challenges.
func NewRegistry(challenges ...Challenge) *Registry {
	r := &Registry{entries: make(map[string]Challenge, len(challenges))}
	for _, ch := range challenges {
		r.entries[ch.Type()] = ch
	}
	return r
}

// Get returns the challenge for the requested type.
func (r *Registry) Get(t string) (Challenge, error) {
	if r == nil {
		return nil, fmt.Errorf("challenge registry uninitialized")
	}
	ch, ok := r.entries[t]
	if !ok {
		return nil, fmt.Errorf("challenge %s not registered", t)
	}
	return ch, nil
}

// Types returns the registered challenge types.
func (r *Registry) Types() []string {
	keys := make([]string, 0, len(r.entries))
	for k := range r.entries {
		keys = append(keys, k)
	}
	return keys
}
