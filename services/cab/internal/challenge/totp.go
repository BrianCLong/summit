package challenge

import "fmt"

// TOTPChallenge is a deterministic stub that validates a provided one-time code.
type TOTPChallenge struct {
	ExpectedCode string
	prompt       string
}

func NewTOTPChallenge(expected string) *TOTPChallenge {
	return &TOTPChallenge{ExpectedCode: expected, prompt: "Enter the code from your authenticator app."}
}

func (t *TOTPChallenge) Type() string { return "totp" }

func (t *TOTPChallenge) Prompt() string { return t.prompt }

func (t *TOTPChallenge) Verify(input VerificationInput) error {
	if input == nil {
		return fmt.Errorf("missing totp input")
	}
	if code := input["code"]; code == t.ExpectedCode {
		return nil
	}
	return fmt.Errorf("invalid totp code")
}
