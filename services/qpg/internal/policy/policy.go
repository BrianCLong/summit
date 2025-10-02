package policy

import "strings"

// Rule describes how a field should be transformed for a tenant/purpose pair.
type Rule struct {
	Field       string `yaml:"field" json:"field"`
	Method      string `yaml:"method" json:"method"`
	AllowReveal bool   `yaml:"allowReveal" json:"allowReveal"`
}

// Definition binds rules to a tenant and purpose.
type Definition struct {
	Tenant  string `yaml:"tenant" json:"tenant"`
	Purpose string `yaml:"purpose" json:"purpose"`
	Rules   []Rule `yaml:"rules" json:"rules"`
}

// Manager resolves policy definitions for requests.
type Manager struct {
	lookup map[string]Definition
}

// NewManager builds a manager from definitions.
func NewManager(defs []Definition) *Manager {
	lookup := make(map[string]Definition, len(defs))
	for _, def := range defs {
		key := makeKey(def.Tenant, def.Purpose)
		lookup[key] = def
	}
	return &Manager{lookup: lookup}
}

// DefinitionFor returns the policy definition for a tenant/purpose, if any.
func (m *Manager) DefinitionFor(tenant, purpose string) (Definition, bool) {
	def, ok := m.lookup[makeKey(tenant, purpose)]
	return def, ok
}

// RuleForField returns the rule for the supplied field.
func (m *Manager) RuleForField(tenant, purpose, field string) (Rule, bool) {
	def, ok := m.DefinitionFor(tenant, purpose)
	if !ok {
		return Rule{}, false
	}
	for _, rule := range def.Rules {
		if strings.EqualFold(rule.Field, field) {
			return rule, true
		}
	}
	return Rule{}, false
}

func makeKey(parts ...string) string {
	return strings.ToLower(strings.Join(parts, "::"))
}
