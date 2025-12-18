package pcl

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Client struct {
	BaseURL     string
	AuthorityID string
	HTTPClient  *http.Client
}

func NewClient(baseURL, authorityID string) *Client {
	return &Client{
		BaseURL:     baseURL,
		AuthorityID: authorityID,
		HTTPClient:  &http.Client{},
	}
}

type EvidenceInput struct {
	Source  string `json:"source"`
	URL     string `json:"url,omitempty"`
	Blob    string `json:"blob,omitempty"`
	License string `json:"license,omitempty"`
	Hash    string `json:"hash"`
}

type TransformInput struct {
	Inputs     []string               `json:"inputs"`
	Tool       string                 `json:"tool"`
	Params     map[string]interface{} `json:"params"`
	Outputs    []string               `json:"outputs"`
	OperatorID string                 `json:"operatorId"`
}

type ClaimInput struct {
	Subject      string   `json:"subject"`
	Predicate    string   `json:"predicate"`
	Object       string   `json:"object"`
	EvidenceRefs []string `json:"evidenceRefs"`
	Confidence   float64  `json:"confidence"`
	LicenseID    string   `json:"licenseId"`
}

func (c *Client) register(endpoint string, payload interface{}) (string, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	// Ensure BaseURL doesn't end with slash and endpoint starts with one
	url := c.BaseURL
	if len(url) > 0 && url[len(url)-1] == '/' {
		url = url[:len(url)-1]
	}
	if len(endpoint) > 0 && endpoint[0] != '/' {
		endpoint = "/" + endpoint
	}
	req, err := http.NewRequest("POST", url+endpoint, bytes.NewBuffer(data))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.AuthorityID != "" {
		req.Header.Set("x-authority-id", c.AuthorityID)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API error: %s - %s", resp.Status, string(body))
	}

	var result map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	for _, k := range []string{"evidenceId", "transformId", "claimId"} {
		if v, ok := result[k]; ok {
			return v, nil
		}
	}

	return "", fmt.Errorf("no ID returned")
}

func (c *Client) RegisterEvidence(input EvidenceInput) (string, error) {
	return c.register("/evidence", input)
}

func (c *Client) RegisterTransform(input TransformInput) (string, error) {
	return c.register("/transform", input)
}

func (c *Client) RegisterClaim(input ClaimInput) (string, error) {
	return c.register("/claim", input)
}
