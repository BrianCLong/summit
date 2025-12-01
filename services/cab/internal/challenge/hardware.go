package challenge

import "fmt"

// HardwareKeyChallenge is a stubbed WebAuthn-like challenge.
type HardwareKeyChallenge struct {
	ExpectedAssertion string
	prompt            string
}

func NewHardwareKeyChallenge(expected string) *HardwareKeyChallenge {
	return &HardwareKeyChallenge{
		ExpectedAssertion: expected,
		prompt:            "Touch your registered security key to continue.",
	}
}

func (h *HardwareKeyChallenge) Type() string { return "hardware-key" }

func (h *HardwareKeyChallenge) Prompt() string { return h.prompt }

func (h *HardwareKeyChallenge) Verify(input VerificationInput) error {
	if input == nil {
		return fmt.Errorf("missing hardware assertion")
	}
	if assertion := input["assertion"]; assertion == h.ExpectedAssertion {
		return nil
	}
	return fmt.Errorf("hardware assertion mismatch")
}
