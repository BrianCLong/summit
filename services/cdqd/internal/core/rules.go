package core

import (
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"

	"summit/services/cdqd/internal/models"
)

func evaluateCondition(cond models.Condition, row map[string]any) bool {
	if len(cond.All) > 0 {
		for _, c := range cond.All {
			if !evaluateCondition(c, row) {
				return cond.Not
			}
		}
		return !cond.Not
	}
	if len(cond.Any) > 0 {
		match := false
		for _, c := range cond.Any {
			if evaluateCondition(c, row) {
				match = true
				break
			}
		}
		if cond.Not {
			return !match
		}
		return match
	}

	value, ok := row[cond.Field]
	if !ok {
		if cond.Operator == "exists" {
			return cond.Not
		}
		if cond.Not {
			return true
		}
		return false
	}

	switch cond.Operator {
	case "exists":
		result := value != nil && value != ""
		if cond.Not {
			return !result
		}
		return result
	case "eq":
		result := compareEquality(value, cond.Value)
		if cond.Not {
			return !result
		}
		return result
	case "neq":
		result := !compareEquality(value, cond.Value)
		if cond.Not {
			return !result
		}
		return result
	case "gt":
		lhs, lok := toFloat(value)
		rhs, rok := toFloat(cond.Value)
		if !lok || !rok {
			return cond.Not
		}
		result := lhs > rhs
		if cond.Not {
			return !result
		}
		return result
	case "lt":
		lhs, lok := toFloat(value)
		rhs, rok := toFloat(cond.Value)
		if !lok || !rok {
			return cond.Not
		}
		result := lhs < rhs
		if cond.Not {
			return !result
		}
		return result
	case "gte":
		lhs, lok := toFloat(value)
		rhs, rok := toFloat(cond.Value)
		if !lok || !rok {
			return cond.Not
		}
		result := lhs >= rhs
		if cond.Not {
			return !result
		}
		return result
	case "lte":
		lhs, lok := toFloat(value)
		rhs, rok := toFloat(cond.Value)
		if !lok || !rok {
			return cond.Not
		}
		result := lhs <= rhs
		if cond.Not {
			return !result
		}
		return result
	case "contains":
		lhs := fmt.Sprintf("%v", value)
		rhs := fmt.Sprintf("%v", cond.Value)
		result := strings.Contains(lhs, rhs)
		if cond.Not {
			return !result
		}
		return result
	case "matches":
		lhs := fmt.Sprintf("%v", value)
		pattern := fmt.Sprintf("%v", cond.Value)
		re, err := regexp.Compile(pattern)
		if err != nil {
			return cond.Not
		}
		result := re.MatchString(lhs)
		if cond.Not {
			return !result
		}
		return result
	default:
		return false
	}
}

func compareEquality(lhs, rhs any) bool {
	switch l := lhs.(type) {
	case string:
		return strings.EqualFold(l, fmt.Sprintf("%v", rhs))
	case float64:
		switch r := rhs.(type) {
		case float64:
			return math.Abs(l-r) < 1e-9
		case string:
			if v, err := strconv.ParseFloat(r, 64); err == nil {
				return math.Abs(l-v) < 1e-9
			}
		}
	case int:
		switch r := rhs.(type) {
		case int:
			return l == r
		case float64:
			return math.Abs(float64(l)-r) < 1e-9
		case string:
			if v, err := strconv.Atoi(r); err == nil {
				return l == v
			}
		}
	case bool:
		switch r := rhs.(type) {
		case bool:
			return l == r
		case string:
			return strings.EqualFold(strconv.FormatBool(l), r)
		}
	}
	return fmt.Sprintf("%v", lhs) == fmt.Sprintf("%v", rhs)
}

func toFloat(value any) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case int32:
		return float64(v), true
	case json.Number:
		f, err := v.Float64()
		if err != nil {
			return 0, false
		}
		return f, true
	case string:
		f, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return 0, false
		}
		return f, true
	default:
		return 0, false
	}
}

func normalizeKey(values map[string]any, fields []string) (string, bool) {
	parts := make([]string, 0, len(fields))
	for _, field := range fields {
		v, ok := values[field]
		if !ok {
			return "", false
		}
		parts = append(parts, fmt.Sprintf("%s=%v", field, v))
	}
	return strings.Join(parts, "|"), true
}
