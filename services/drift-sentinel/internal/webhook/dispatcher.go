package webhook

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"time"
)

// HTTPClient is the subset of the http.Client used by Dispatcher. It enables injecting
// mocks for testing without pulling in additional dependencies.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// Dispatcher posts drift alerts to downstream systems.
type Dispatcher struct {
	client    HTTPClient
	endpoints []string
	timeout   time.Duration
}

// NewDispatcher returns a dispatcher configured with the provided HTTP client and target
// endpoints. A nil client defaults to http.DefaultClient.
func NewDispatcher(endpoints []string, client HTTPClient, timeout time.Duration) *Dispatcher {
	if client == nil {
		client = http.DefaultClient
	}
	if timeout == 0 {
		timeout = 5 * time.Second
	}
	return &Dispatcher{client: client, endpoints: endpoints, timeout: timeout}
}

// Dispatch posts the alert payload to every configured endpoint. Errors are aggregated
// and returned for observability but do not stop dispatching to subsequent endpoints.
func (d *Dispatcher) Dispatch(ctx context.Context, payload any) error {
	if len(d.endpoints) == 0 {
		return nil
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	var firstErr error
	for _, endpoint := range d.endpoints {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
		if err != nil {
			if firstErr == nil {
				firstErr = err
			}
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		ctx, cancel := context.WithTimeout(req.Context(), d.timeout)
		req = req.WithContext(ctx)
		resp, err := d.client.Do(req)
		cancel()
		if err != nil {
			if firstErr == nil {
				firstErr = err
			}
			continue
		}
		_ = resp.Body.Close()
		if resp.StatusCode >= 400 && firstErr == nil {
			firstErr = errFromStatus(resp.StatusCode)
		}
	}
	return firstErr
}

func errFromStatus(status int) error {
	return &httpError{status: status}
}

type httpError struct {
	status int
}

func (e *httpError) Error() string {
	return http.StatusText(e.status)
}
