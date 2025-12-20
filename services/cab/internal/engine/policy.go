package engine

import (
	"strings"

	"github.com/summit/cab/internal/risk"
)

// AttributeCondition expresses a simple ABAC condition on an attribute value.
type AttributeCondition struct {
	Equals string   `json:"equals,omitempty"`
	In     []string `json:"in,omitempty"`
	NotIn  []string `json:"notIn,omitempty"`
	Exists *bool    `json:"exists,omitempty"`
}

func (c AttributeCondition) evaluate(val string, ok bool) bool {
	if c.Exists != nil {
		if *c.Exists != ok {
			return false
		}
	}
	if !ok {
		return c.Equals == "" && len(c.In) == 0 && len(c.NotIn) == 0
	}
	if c.Equals != "" && !strings.EqualFold(c.Equals, val) {
		return false
	}
	if len(c.In) > 0 {
		matched := false
		for _, candidate := range c.In {
			if strings.EqualFold(candidate, val) {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}
	if len(c.NotIn) > 0 {
		for _, candidate := range c.NotIn {
			if strings.EqualFold(candidate, val) {
				return false
			}
		}
	}
	return true
}

// Policy describes an ABAC rule used by the engine.
type Policy struct {
	ID               string
	Description      string
	Actions          []string
	Subject          map[string]AttributeCondition
	Resource         map[string]AttributeCondition
	Effect           Decision
	AllowRisk        risk.Level
	StepUpRisk       risk.Level
	StepUpChallenges []string
}

func (p Policy) matches(req Request) bool {
	if len(p.Actions) > 0 {
		matched := false
		for _, action := range p.Actions {
			if strings.EqualFold(action, req.Action) {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}
	if !matchAttributes(p.Subject, req.Subject) {
		return false
	}
	if !matchAttributes(p.Resource, req.Resource) {
		return false
	}
	return true
}

func matchAttributes(conditions map[string]AttributeCondition, values map[string]string) bool {
	for key, cond := range conditions {
		val, ok := values[key]
		if !cond.evaluate(val, ok) {
			return false
		}
	}
	return true
}
