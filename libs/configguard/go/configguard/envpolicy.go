package configguard

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

var envVarPattern = regexp.MustCompile(`\$\{([A-Z0-9_]+)(?::-(.*?))?\}`)

func applyInterpolation(input string, pointer string, pointerMap map[string]Position, policy InterpolationPolicy, diags *[]Diagnostic) string {
	result := input
	matches := envVarPattern.FindAllStringSubmatchIndex(input, -1)
	if len(matches) == 0 {
		return input
	}

	for _, match := range matches {
		full := input[match[0]:match[1]]
		name := input[match[2]:match[3]]
		fallback := ""
		if len(match) >= 6 && match[4] != -1 && match[5] != -1 {
			fallback = input[match[4]:match[5]]
		}

		if contains(policy.DenyList, name) {
			appendGoDiagnostic(diags, pointer, pointerMap, SeverityError, fmt.Sprintf("environment variable %q is blocked by policy", name), "remove the reference or update the policy")
			continue
		}

		if policy.RequireAllowList && !contains(policy.AllowList, name) {
			appendGoDiagnostic(diags, pointer, pointerMap, SeverityError, fmt.Sprintf("environment variable %q is not in the allow list", name), "declare it via --allow-env or policy")
			continue
		}

		if len(policy.AllowList) > 0 && !policy.RequireAllowList && !contains(policy.AllowList, name) {
			appendGoDiagnostic(diags, pointer, pointerMap, SeverityWarning, fmt.Sprintf("environment variable %q is not listed in allow list", name), "add it to allow list for deterministic builds")
		}

		replacement, ok := os.LookupEnv(name)
		if !ok {
			if value, exists := policy.Defaults[name]; exists {
				replacement = value
				ok = true
			}
		}
		if !ok && fallback != "" {
			replacement = fallback
			ok = true
		}

		if !ok {
			switch policy.OnMissing {
			case MissingError:
				appendGoDiagnostic(diags, pointer, pointerMap, SeverityError, fmt.Sprintf("missing environment variable %q", name), "set the variable or provide a default")
			case MissingWarn, "":
				appendGoDiagnostic(diags, pointer, pointerMap, SeverityWarning, fmt.Sprintf("missing environment variable %q", name), "set the variable or provide a default")
			case MissingIgnore:
			}
			continue
		}

		result = strings.Replace(result, full, replacement, 1)
	}

	return result
}

func appendGoDiagnostic(diags *[]Diagnostic, pointer string, pointerMap map[string]Position, severity Severity, message, hint string) {
	pos, ok := pointerMap[pointer]
	if !ok {
		pos = pointerMap[""]
	}

	diagnostic := Diagnostic{
		Severity: severity,
		Message:  message,
		Pointer:  pointer,
		Line:     pos.Line,
		Column:   pos.Column,
		Hint:     hint,
	}
	*diags = append(*diags, diagnostic)
}

func contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}
