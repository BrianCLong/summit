package rotator

import (
	"fmt"
	"io"
	"strings"
)

// Provider enumerates supported secret rotation providers.
type Provider string

const (
	ProviderAWS    Provider = "aws"
	ProviderGCP    Provider = "gcp"
	ProviderAzure  Provider = "azure"
	ProviderGitHub Provider = "github"
	ProviderSlack  Provider = "slack"
	ProviderStripe Provider = "stripe"
	ProviderTwilio Provider = "twilio"
)

// Hook represents a rotation hook implementation.
type Hook func(secretType, secret string) error

// Manager coordinates provider-specific rotation hooks.
type Manager struct {
	hooks map[Provider]Hook
	out   io.Writer
}

// NewManager constructs a rotation manager with stub implementations.
func NewManager(out io.Writer) *Manager {
	m := &Manager{hooks: make(map[Provider]Hook), out: out}
	m.Register(ProviderAWS, m.stub("AWS"))
	m.Register(ProviderGCP, m.stub("GCP"))
	m.Register(ProviderAzure, m.stub("Azure"))
	m.Register(ProviderGitHub, m.stub("GitHub"))
	m.Register(ProviderSlack, m.stub("Slack"))
	m.Register(ProviderStripe, m.stub("Stripe"))
	m.Register(ProviderTwilio, m.stub("Twilio"))
	return m
}

// Register associates a provider with a hook.
func (m *Manager) Register(provider Provider, hook Hook) {
	provider = Provider(strings.ToLower(string(provider)))
	m.hooks[provider] = hook
}

// Rotate executes the hook for the provider.
func (m *Manager) Rotate(provider Provider, secretType, secret string) error {
	hook, ok := m.hooks[provider]
	if !ok {
		return fmt.Errorf("no rotation hook for provider %s", provider)
	}
	return hook(secretType, secret)
}

func (m *Manager) stub(name string) Hook {
	return func(secretType, secret string) error {
		if m.out != nil {
			fmt.Fprintf(m.out, "[sss] auto-rotate stub invoked for %s (%s)\n", name, secretType)
		}
		return nil
	}
}
