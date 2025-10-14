package configguard

import (
	"bytes"
	"crypto/sha1"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/santhosh-tekuri/jsonschema/v5"
	"gopkg.in/yaml.v3"
)

// Severity represents the diagnostic severity.
type Severity string

const (
	// SeverityError indicates a validation failure.
	SeverityError Severity = "error"
	// SeverityWarning indicates a recoverable issue.
	SeverityWarning Severity = "warning"
)

// Diagnostic captures a validation or interpolation issue.
type Diagnostic struct {
	Severity Severity `json:"severity"`
	Message  string   `json:"message"`
	Pointer  string   `json:"pointer"`
	Line     int      `json:"line,omitempty"`
	Column   int      `json:"column,omitempty"`
	Code     string   `json:"code,omitempty"`
	Hint     string   `json:"hint,omitempty"`
}

// Result represents the outcome of Load.
type Result struct {
	Config      any
	Diagnostics []Diagnostic
	PointerMap  map[string]Position
}

// Position stores the original line and column for a JSON pointer.
type Position struct {
	Line   int
	Column int
}

// LoadOptions controls config loading behaviour.
type LoadOptions struct {
	Interpolation InterpolationPolicy
	Strict        bool
}

// InterpolationPolicy defines env var substitution policy.
type InterpolationPolicy struct {
	AllowList        []string
	DenyList         []string
	Defaults         map[string]string
	OnMissing        MissingBehavior
	RequireAllowList bool
}

// MissingBehavior controls severity for missing env vars.
type MissingBehavior string

const (
	MissingError  MissingBehavior = "error"
	MissingWarn   MissingBehavior = "warn"
	MissingIgnore MissingBehavior = "ignore"
)

// Load loads and validates the configuration file using the supplied schema path.
func Load(configPath string, schemaPath string, opts *LoadOptions) (*Result, error) {
	if opts == nil {
		opts = &LoadOptions{}
	}

	parsed, err := parseConfig(configPath)
	if err != nil {
		return nil, err
	}

	diagnostics := append([]Diagnostic{}, parsed.Diagnostics...)
	if parsed.Value == nil {
		return &Result{Config: nil, Diagnostics: diagnostics, PointerMap: parsed.PointerMap}, nil
	}

	cfg := interpolate(parsed.Value, "", parsed.PointerMap, opts.Interpolation, &diagnostics)

	schema, err := compileSchema(schemaPath)
	if err != nil {
		return nil, err
	}

	diagnostics = append(diagnostics, validate(cfg, schema, parsed.PointerMap)...)

	var config any = cfg
	if opts.Strict {
		for _, diag := range diagnostics {
			if diag.Severity == SeverityError {
				config = nil
				break
			}
		}
	}

	return &Result{
		Config:      config,
		Diagnostics: diagnostics,
		PointerMap:  parsed.PointerMap,
	}, nil
}

// Validate validates an arbitrary configuration object against the schema at path.
func Validate(value any, schemaPath string) ([]Diagnostic, error) {
	schema, err := compileSchema(schemaPath)
	if err != nil {
		return nil, err
	}
	return validate(value, schema, nil), nil
}

// ValidateWithSchema validates using a precompiled schema.
func ValidateWithSchema(value any, schema *jsonschema.Schema, pointerMap map[string]Position) []Diagnostic {
	return validate(value, schema, pointerMap)
}

var schemaCache sync.Map

func compileSchema(path string) (*jsonschema.Schema, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}

	if value, ok := schemaCache.Load(abs); ok {
		return value.(*jsonschema.Schema), nil
	}

	data, err := os.ReadFile(abs)
	if err != nil {
		return nil, err
	}

	h := sha1.Sum(data)
	key := fmt.Sprintf("sha1-%x", h[:])
	compiler := jsonschema.NewCompiler()
	compiler.LoadURL = func(u string) (io.ReadCloser, error) {
		return nil, fmt.Errorf("external references are disabled: %s", u)
	}
	if err := compiler.AddResource(key, bytes.NewReader(data)); err != nil {
		return nil, err
	}
	schema, err := compiler.Compile(key)
	if err != nil {
		return nil, err
	}

	schemaCache.Store(abs, schema)
	return schema, nil
}

// ParsedConfig captures intermediate parsing result.
type ParsedConfig struct {
	Value       any
	Diagnostics []Diagnostic
	PointerMap  map[string]Position
}

func parseConfig(path string) (*ParsedConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	dec := yaml.NewDecoder(bytes.NewReader(data))
	dec.KnownFields(false)

	var root yaml.Node
	if err := dec.Decode(&root); err != nil {
		return &ParsedConfig{
			Value:       nil,
			Diagnostics: []Diagnostic{parseErrorDiagnostic(err)},
			PointerMap:  map[string]Position{"": {Line: 0, Column: 0}},
		}, nil
	}

	if len(root.Content) == 0 {
		return &ParsedConfig{
			Value:       nil,
			Diagnostics: nil,
			PointerMap:  map[string]Position{"": {Line: 1, Column: 1}},
		}, nil
	}

	pointerMap := map[string]Position{}
	collectPointers(root.Content[0], "", pointerMap)

	value := nodeToInterface(root.Content[0])

	return &ParsedConfig{
		Value:       value,
		Diagnostics: nil,
		PointerMap:  pointerMap,
	}, nil
}

func parseErrorDiagnostic(err error) Diagnostic {
	var syntax *yaml.TypeError
	if errors.As(err, &syntax) {
		return Diagnostic{Severity: SeverityError, Message: strings.Join(syntax.Errors, "; "), Pointer: ""}
	}
	return Diagnostic{Severity: SeverityError, Message: err.Error(), Pointer: ""}
}

func collectPointers(node *yaml.Node, pointer string, pointerMap map[string]Position) {
	if node == nil {
		return
	}

	pointerMap[pointer] = Position{Line: node.Line, Column: node.Column}

	switch node.Kind {
	case yaml.MappingNode:
		for i := 0; i < len(node.Content); i += 2 {
			keyNode := node.Content[i]
			valueNode := node.Content[i+1]
			childPointer := joinPointer(pointer, keyNode.Value)
			collectPointers(valueNode, childPointer, pointerMap)
		}
	case yaml.SequenceNode:
		for i, child := range node.Content {
			childPointer := fmt.Sprintf("%s/%d", pointer, i)
			collectPointers(child, childPointer, pointerMap)
		}
	}
}

func nodeToInterface(node *yaml.Node) any {
	switch node.Kind {
	case yaml.MappingNode:
		result := make(map[string]any, len(node.Content)/2)
		for i := 0; i < len(node.Content); i += 2 {
			key := node.Content[i].Value
			result[key] = nodeToInterface(node.Content[i+1])
		}
		return result
	case yaml.SequenceNode:
		result := make([]any, len(node.Content))
		for i, child := range node.Content {
			result[i] = nodeToInterface(child)
		}
		return result
	case yaml.ScalarNode:
		switch node.Tag {
		case "!!int":
			var v int
			fmt.Sscanf(node.Value, "%d", &v)
			return v
		case "!!bool":
			return node.Value == "true"
		case "!!null":
			return nil
		default:
			return node.Value
		}
	default:
		return nil
	}
}

func joinPointer(parent string, segment string) string {
	escaped := strings.ReplaceAll(strings.ReplaceAll(segment, "~", "~0"), "/", "~1")
	if parent == "" {
		return "/" + escaped
	}
	return parent + "/" + escaped
}

func interpolate(value any, pointer string, pointerMap map[string]Position, policy InterpolationPolicy, diags *[]Diagnostic) any {
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, val := range typed {
			childPointer := joinPointer(pointer, key)
			out[key] = interpolate(val, childPointer, pointerMap, policy, diags)
		}
		return out
	case []any:
		out := make([]any, len(typed))
		for i, val := range typed {
			childPointer := fmt.Sprintf("%s/%d", pointer, i)
			out[i] = interpolate(val, childPointer, pointerMap, policy, diags)
		}
		return out
	case string:
		return applyInterpolation(typed, pointer, pointerMap, policy, diags)
	default:
		return value
	}
}

func validate(value any, schema *jsonschema.Schema, pointerMap map[string]Position) []Diagnostic {
	err := schema.Validate(value)
	if err == nil {
		return nil
	}

	var ve *jsonschema.ValidationError
	if errors.As(err, &ve) {
		return flattenValidationErrors(ve, pointerMap)
	}

	return []Diagnostic{{
		Severity: SeverityError,
		Message:  err.Error(),
		Pointer:  "",
	}}
}

func flattenValidationErrors(err *jsonschema.ValidationError, pointerMap map[string]Position) []Diagnostic {
	if len(err.Causes) == 0 {
		return []Diagnostic{buildDiagnostic(err, pointerMap)}
	}

	var diags []Diagnostic
	for _, cause := range err.Causes {
		diags = append(diags, flattenValidationErrors(cause, pointerMap)...)
	}
	return diags
}

func buildDiagnostic(err *jsonschema.ValidationError, pointerMap map[string]Position) Diagnostic {
	pointer := normalizePointer(err.InstanceLocation)
	pos := Position{}
	if pointerMap != nil {
		if p, ok := pointerMap[pointer]; ok {
			pos = p
		}
	}

	diag := Diagnostic{
		Severity: SeverityError,
		Message:  err.Message,
		Pointer:  pointer,
		Line:     pos.Line,
		Column:   pos.Column,
	}

	if err.KeywordLocation != "" {
		diag.Code = err.KeywordLocation
	}

	return diag
}

func normalizePointer(pointer string) string {
	if pointer == "" {
		return ""
	}
	parts := strings.Split(pointer, "/")
	var buf strings.Builder
	for _, part := range parts {
		if part == "" {
			continue
		}
		unescaped := strings.ReplaceAll(strings.ReplaceAll(part, "~1", "/"), "~0", "~")
		buf.WriteString("/")
		buf.WriteString(strings.ReplaceAll(strings.ReplaceAll(unescaped, "~", "~0"), "/", "~1"))
	}
	return buf.String()
}
