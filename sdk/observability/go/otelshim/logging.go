package otelshim

import (
	"encoding/json"
	"io"
	"os"
	"strings"
)

type logEnvelope struct {
	Level     string            `json:"level"`
	Message   string            `json:"message"`
	Timestamp string            `json:"ts"`
	Fields    map[string]string `json:"fields"`
}

// NewJSONLogger wraps the standard library logger with structured output and PII guards.
func NewJSONLogger(out io.Writer, cfg Config) io.Writer {
	return &jsonLogger{out: out, redact: cfg.PIIRedactionEnabled}
}

type jsonLogger struct {
	out    io.Writer
	redact bool
}

func (j *jsonLogger) Write(p []byte) (int, error) {
	line := strings.TrimSpace(string(p))
	if line == "" {
		return len(p), nil
	}

	env := logEnvelope{
		Level:     "info",
		Message:   redactPII(line, j.redact),
		Timestamp: os.Getenv("LOG_TIMESTAMP"),
		Fields: map[string]string{
			"service.name":   os.Getenv("OTEL_SERVICE_NAME"),
			"deployment.env": os.Getenv("DEPLOY_ENV"),
			"trace_id":       os.Getenv("OTEL_TRACE_ID"),
			"span_id":        os.Getenv("OTEL_SPAN_ID"),
		},
	}

	payload, err := json.Marshal(env)
	if err != nil {
		return j.out.Write(p)
	}
	payload = append(payload, '\n')
	return j.out.Write(payload)
}

func redactPII(message string, enabled bool) string {
	if !enabled {
		return message
	}
	replacements := []string{"email:", "ssn:", "card:"}
	lower := strings.ToLower(message)
	for _, token := range replacements {
		if idx := strings.Index(lower, token); idx >= 0 {
			return message[:idx] + token + "***REDACTED***"
		}
	}
	return message
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
