package abac

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// DecisionRequest represents the payload sent to the authorize endpoint.
type DecisionRequest struct {
	SubjectID string         `json:"subjectId"`
	Action    string         `json:"action"`
	Resource  map[string]any `json:"resource,omitempty"`
	Context   map[string]any `json:"context,omitempty"`
}

// Obligation describes obligations returned by the policy engine.
type Obligation struct {
	Type        string `json:"type"`
	RequiredACR string `json:"required_acr,omitempty"`
	Mechanism   string `json:"mechanism,omitempty"`
}

// DecisionResponse contains the allow/deny decision and metadata.
type DecisionResponse struct {
	Allow       bool         `json:"allow"`
	Reason      string       `json:"reason"`
	Obligations []Obligation `json:"obligations"`
}

// SubjectAttributesResponse wraps attribute responses from the attribute service.
type SubjectAttributesResponse struct {
	Data   map[string]any    `json:"data"`
	Schema map[string]string `json:"schema"`
}

// ClientOption configures the ABAC client.
type ClientOption func(*Client)

// Client interacts with the gateway decision and attribute APIs.
type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

// WithToken sets the bearer token used for requests.
func WithToken(token string) ClientOption {
	return func(c *Client) {
		c.token = token
	}
}

// WithHTTPClient overrides the default HTTP client.
func WithHTTPClient(client *http.Client) ClientOption {
	return func(c *Client) {
		c.httpClient = client
	}
}

// NewClient returns a configured ABAC client.
func NewClient(baseURL string, opts ...ClientOption) *Client {
	c := &Client{
		baseURL:    strings.TrimSuffix(baseURL, "/"),
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

func (c *Client) addAuth(req *http.Request) {
	if c.token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.token))
	}
}

// IsAllowed calls the /authorize endpoint and returns the decision.
func (c *Client) IsAllowed(ctx context.Context, req DecisionRequest) (*DecisionResponse, error) {
	payload := map[string]any{
		"subject": map[string]any{"id": req.SubjectID},
		"action":  req.Action,
	}
	if len(req.Resource) > 0 {
		payload["resource"] = req.Resource
	}
	if len(req.Context) > 0 {
		payload["context"] = req.Context
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/authorize", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	c.addAuth(httpReq)
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("authorize_failed_%d", resp.StatusCode)
	}
	var decision DecisionResponse
	if err := json.NewDecoder(resp.Body).Decode(&decision); err != nil {
		return nil, err
	}
	return &decision, nil
}

// GetSubjectAttributes retrieves subject attributes from the gateway.
func (c *Client) GetSubjectAttributes(ctx context.Context, subjectID string, refresh bool) (*SubjectAttributesResponse, error) {
	endpoint, err := url.Parse(c.baseURL + "/subject/" + subjectID + "/attributes")
	if err != nil {
		return nil, err
	}
	if refresh {
		q := endpoint.Query()
		q.Set("refresh", "true")
		endpoint.RawQuery = q.Encode()
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, err
	}
	c.addAuth(httpReq)
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("attributes_failed_%d", resp.StatusCode)
	}
	var payload SubjectAttributesResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return &payload, nil
}
