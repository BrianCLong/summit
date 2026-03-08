package redact

import (
	"regexp"
)

type Redactor struct {
	patterns []*regexp.Regexp
}

func NewRedactor() *Redactor {
	return &Redactor{
		patterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(bearer\s+[a-z0-9\-\._~+/]+=*)`),
			regexp.MustCompile(`(?i)(AKIA[0-9A-Z]{16})`),
			regexp.MustCompile(`(?i)(sk_[a-zA-Z0-9]{24,})`), // dummy secret pattern
		},
	}
}

func (r *Redactor) AddPattern(pattern string) error {
	regex, err := regexp.Compile(pattern)
	if err != nil {
		return err
	}
	r.patterns = append(r.patterns, regex)
	return nil
}

func (r *Redactor) Redact(input []byte) []byte {
	out := input
	for _, p := range r.patterns {
		out = p.ReplaceAll(out, []byte("[REDACTED]"))
	}
	return out
}
