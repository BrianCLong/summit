package mpes

import (
	"fmt"
	"sort"
)

// PolicyFirewall enforces capability walls between parties and the runner.
type PolicyFirewall interface {
	Enforce(partyID string, declared []Capability) error
}

// StaticPolicyFirewall enforces a static allowlist of capabilities per party.
type StaticPolicyFirewall struct {
	allowed map[string]map[Capability]struct{}
}

// NewStaticPolicyFirewall creates a policy firewall with the provided allowlists.
func NewStaticPolicyFirewall(partyCapabilities map[string][]Capability) *StaticPolicyFirewall {
	allowed := make(map[string]map[Capability]struct{}, len(partyCapabilities))
	for party, caps := range partyCapabilities {
		capSet := make(map[Capability]struct{}, len(caps))
		for _, c := range caps {
			capSet[c] = struct{}{}
		}
		allowed[party] = capSet
	}
	return &StaticPolicyFirewall{allowed: allowed}
}

// Enforce ensures the declared capabilities fall within the party's allowlist.
func (s *StaticPolicyFirewall) Enforce(partyID string, declared []Capability) error {
	allowed, ok := s.allowed[partyID]
	if !ok {
		return fmt.Errorf("party %s is not registered with the policy firewall", partyID)
	}
	unauthorized := make([]string, 0)
	for _, capability := range declared {
		if _, exists := allowed[capability]; !exists {
			unauthorized = append(unauthorized, string(capability))
		}
	}
	if len(unauthorized) > 0 {
		sort.Strings(unauthorized)
		return fmt.Errorf("party %s declared unauthorized capabilities: %v", partyID, unauthorized)
	}
	return nil
}
