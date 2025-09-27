package notifier

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"time"
)

// Notifier publishes lifecycle events to interested systems.
type Notifier interface {
	Notify(ctx context.Context, eventType string, payload any) error
}

// Noop implements Notifier and intentionally drops events.
type Noop struct{}

// Notify satisfies the Notifier interface.
func (Noop) Notify(ctx context.Context, eventType string, payload any) error {
	return nil
}

// WebhookNotifier sends JSON events to an HTTP endpoint.
type WebhookNotifier struct {
	URL     string
	Client  *http.Client
	Headers map[string]string
}

// Notify posts the payload as JSON to the configured webhook URL.
func (w WebhookNotifier) Notify(ctx context.Context, eventType string, payload any) error {
	if w.URL == "" {
		return nil
	}
	body, err := json.Marshal(struct {
		Type    string      `json:"type"`
		Payload interface{} `json:"payload"`
		SentAt  time.Time   `json:"sentAt"`
	}{
		Type:    eventType,
		Payload: payload,
		SentAt:  time.Now().UTC(),
	})
	if err != nil {
		return err
	}

	client := w.Client
	if client == nil {
		client = http.DefaultClient
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.URL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range w.Headers {
		req.Header.Set(k, v)
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return &httpError{status: resp.StatusCode}
	}
	return nil
}

type httpError struct {
	status int
}

func (e *httpError) Error() string {
	return http.StatusText(e.status)
}
