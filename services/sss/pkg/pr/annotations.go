package pr

import (
	"fmt"
	"io"

	"github.com/summit/sss/pkg/models"
)

// Annotator emits findings using GitHub Actions annotation syntax.
type Annotator struct {
	Out io.Writer
}

// New creates an annotator with the given writer.
func New(out io.Writer) *Annotator {
	return &Annotator{Out: out}
}

// Emit renders annotations for the supplied findings.
func (a *Annotator) Emit(findings []models.Finding) {
	if a == nil || a.Out == nil {
		return
	}
	for _, f := range findings {
		severity := "warning"
		if f.Severity == models.SeverityCritical || f.Severity == models.SeverityHigh {
			severity = "error"
		}
		fmt.Fprintf(
			a.Out,
			"::%s file=%s,line=%d,col=%d::%s (%s)\n",
			severity,
			f.FilePath,
			f.Line,
			f.Column,
			f.Description,
			f.SecretType,
		)
	}
}
