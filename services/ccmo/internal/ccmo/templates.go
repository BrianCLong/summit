package ccmo

import (
	"embed"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"text/template"
)

//go:embed templates/*.tmpl
var templatesFS embed.FS

// TemplateKey identifies a specific localized rendering variant.
type TemplateKey struct {
	Name    string
	Channel string
	Locale  string
	Dark    bool
}

// TemplateRenderer loads and renders localized templates.
type TemplateRenderer struct {
	mu        sync.RWMutex
	templates map[TemplateKey]*template.Template
}

// NewTemplateRenderer parses all embedded templates.
func NewTemplateRenderer() (*TemplateRenderer, error) {
	entries, err := templatesFS.ReadDir("templates")
	if err != nil {
		return nil, err
	}
	parsed := make(map[TemplateKey]*template.Template)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".tmpl") {
			continue
		}
		base := strings.TrimSuffix(name, ".tmpl")
		parts := strings.Split(base, "_")
		if len(parts) < 4 {
			return nil, fmt.Errorf("template %s does not follow <channel>_<name>_<locale>_<mode>.tmpl format", name)
		}
		channel := parts[0]
		tplName := parts[1]
		mode := parts[len(parts)-1]
		locale := strings.Join(parts[2:len(parts)-1], "_")
		isDark := mode == "dark"
		content, err := templatesFS.ReadFile(filepath.ToSlash(filepath.Join("templates", name)))
		if err != nil {
			return nil, err
		}
		tpl, err := template.New(name).Parse(string(content))
		if err != nil {
			return nil, err
		}
		key := TemplateKey{Name: tplName, Channel: channel, Locale: locale, Dark: isDark}
		parsed[key] = tpl
	}
	return &TemplateRenderer{templates: parsed}, nil
}

// Render produces the final content for a template variant.
func (r *TemplateRenderer) Render(key TemplateKey, data map[string]any) (string, error) {
	r.mu.RLock()
	tpl, ok := r.templates[key]
	r.mu.RUnlock()
	if !ok {
		return "", fmt.Errorf("template not found for %s/%s/%s (dark=%t)", key.Channel, key.Name, key.Locale, key.Dark)
	}
	var builder strings.Builder
	if err := tpl.Execute(&builder, data); err != nil {
		return "", err
	}
	return builder.String(), nil
}
