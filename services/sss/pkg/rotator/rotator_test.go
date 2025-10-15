package rotator_test

import (
	"bytes"
	"strings"
	"testing"

	"github.com/summit/sss/pkg/rotator"
)

func TestRotationStubsEmit(t *testing.T) {
	var buf bytes.Buffer
	mgr := rotator.NewManager(&buf)
	providers := []rotator.Provider{
		rotator.ProviderAWS,
		rotator.ProviderGCP,
		rotator.ProviderAzure,
		rotator.ProviderGitHub,
		rotator.ProviderSlack,
		rotator.ProviderStripe,
		rotator.ProviderTwilio,
	}
	for _, provider := range providers {
		if err := mgr.Rotate(provider, "test-secret", "value"); err != nil {
			t.Fatalf("rotate %s: %v", provider, err)
		}
	}
	out := buf.String()
	for _, provider := range []string{"AWS", "GCP", "Azure", "GitHub", "Slack", "Stripe", "Twilio"} {
		if !strings.Contains(out, provider) {
			t.Fatalf("expected output to mention %s", provider)
		}
	}
}
