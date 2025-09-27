package ccmo

import (
	"testing"
	"time"
)

type stubClock struct {
	now time.Time
}

func (s *stubClock) Now() time.Time {
	return s.now
}

func TestSendBlocksWithoutConsent(t *testing.T) {
	clock := &stubClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)}
	service, err := NewService(clock)
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}

	req := NotificationRequest{
		SubjectID: "user-1",
		Topic:     "product",
		Purpose:   "onboarding",
		Channel:   ChannelEmail,
		Locale:    "en-US",
		DarkMode:  false,
		Template:  "welcome",
		Data: map[string]any{
			"subject": "Welcome",
			"name":    "Casey",
			"body":    "Here's how to get started.",
		},
	}

	resp, err := service.Send(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Status != "blocked" {
		t.Fatalf("expected blocked status, got %s", resp.Status)
	}
	appeals := service.Appeals()
	if len(appeals) != 1 {
		t.Fatalf("expected 1 appeal entry, got %d", len(appeals))
	}
	if appeals[0].Reason != AppealReasonConsent {
		t.Fatalf("expected consent appeal, got %s", appeals[0].Reason)
	}
}

func TestFrequencyCapEnforced(t *testing.T) {
	clock := &stubClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)}
	service, err := NewService(clock)
	if err != nil {
		t.Fatalf("failed to create service: %v", err)
	}
	service.SetConsent("user-1", "product", "onboarding", ConsentRecord{Allowed: true})
	service.SetFrequencyCap(ChannelEmail, FrequencyCap{MaxMessages: 1, Period: time.Hour})

	req := NotificationRequest{
		SubjectID: "user-1",
		Topic:     "product",
		Purpose:   "onboarding",
		Channel:   ChannelEmail,
		Locale:    "en-US",
		DarkMode:  false,
		Template:  "welcome",
		Data: map[string]any{
			"subject": "Welcome",
			"name":    "Casey",
			"body":    "Here's how to get started.",
		},
	}

	resp, err := service.Send(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Status != "sent" {
		t.Fatalf("expected sent status, got %s", resp.Status)
	}

	resp, err = service.Send(req)
	if err != nil {
		t.Fatalf("unexpected error on second attempt: %v", err)
	}
	if resp.Status != "blocked" {
		t.Fatalf("expected blocked status, got %s", resp.Status)
	}
	appeals := service.Appeals()
	if len(appeals) != 1 {
		t.Fatalf("expected 1 appeal entry, got %d", len(appeals))
	}
	if appeals[0].Reason != AppealReasonFrequency {
		t.Fatalf("expected frequency appeal, got %s", appeals[0].Reason)
	}
}
