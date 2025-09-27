package eligibility

import (
	"fmt"
	"strings"
)

// Rule defines a simple eligibility predicate evaluated against participant attributes.
type Rule struct {
	Attribute string      `json:"attribute"`
	Operator  string      `json:"operator"`
	Value     interface{} `json:"value"`
}

// Filter groups rules using AND/OR semantics.
type Filter struct {
	All []Rule `json:"all,omitempty"`
	Any []Rule `json:"any,omitempty"`
}

// Evaluate determines if the provided attributes satisfy the filter.
func (f Filter) Evaluate(attrs map[string]interface{}) bool {
	if len(f.All) == 0 && len(f.Any) == 0 {
		return true
	}
	if len(f.All) > 0 {
		for _, rule := range f.All {
			if !rule.evaluate(attrs) {
				return false
			}
		}
	}
	if len(f.Any) > 0 {
		for _, rule := range f.Any {
			if rule.evaluate(attrs) {
				return true
			}
		}
		return false
	}
	return true
}

func (r Rule) evaluate(attrs map[string]interface{}) bool {
	value, ok := attrs[r.Attribute]
	if !ok {
		return false
	}
	switch strings.ToLower(r.Operator) {
	case "eq":
		return compareEquality(value, r.Value)
	case "ne":
		return !compareEquality(value, r.Value)
	case "gt":
		return compareOrder(value, r.Value) > 0
	case "gte":
		return compareOrder(value, r.Value) >= 0
	case "lt":
		return compareOrder(value, r.Value) < 0
	case "lte":
		return compareOrder(value, r.Value) <= 0
	case "in":
		return contains(r.Value, value)
	case "nin":
		return !contains(r.Value, value)
	default:
		return false
	}
}

func compareEquality(left, right interface{}) bool {
	switch l := left.(type) {
	case string:
		if r, ok := right.(string); ok {
			return l == r
		}
	case float64:
		switch r := right.(type) {
		case float64:
			return l == r
		case int:
			return l == float64(r)
		}
	case int:
		switch r := right.(type) {
		case float64:
			return float64(l) == r
		case int:
			return l == r
		}
	case bool:
		if r, ok := right.(bool); ok {
			return l == r
		}
	}
	return false
}

func compareOrder(left, right interface{}) int {
	lf, lok := toFloat(left)
	rf, rok := toFloat(right)
	if !lok || !rok {
		return 0
	}
	if lf < rf {
		return -1
	}
	if lf > rf {
		return 1
	}
	return 0
}

func contains(haystack interface{}, needle interface{}) bool {
	switch v := haystack.(type) {
	case []interface{}:
		for _, item := range v {
			if compareEquality(item, needle) {
				return true
			}
		}
	case []string:
		if s, ok := needle.(string); ok {
			for _, item := range v {
				if item == s {
					return true
				}
			}
		}
	case []float64:
		if f, ok := toFloat(needle); ok {
			for _, item := range v {
				if item == f {
					return true
				}
			}
		}
	case []int:
		if f, ok := toFloat(needle); ok {
			for _, item := range v {
				if float64(item) == f {
					return true
				}
			}
		}
	case map[string]interface{}:
		if s, ok := needle.(string); ok {
			_, ok := v[s]
			return ok
		}
	case string:
		if s, ok := needle.(string); ok {
			return strings.Contains(v, s)
		}
	}
	return false
}

func toFloat(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case int:
		return float64(v), true
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case string:
		var f float64
		_, err := fmt.Sscanf(v, "%f", &f)
		if err == nil {
			return f, true
		}
	}
	return 0, false
}
