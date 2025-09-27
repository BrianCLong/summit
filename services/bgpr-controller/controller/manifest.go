package controller

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"
)

type GuardrailThresholds struct {
	MinBlockRate float64 `json:"minBlockRate"`
	MaxLatencyMs float64 `json:"maxLatencyMs"`
	MaxFnDelta   float64 `json:"maxFnDelta"`
}

type RolloutManifest struct {
	ID                string              `json:"id"`
	PolicyVersion     string              `json:"policyVersion"`
	CanaryPopulation  []string            `json:"canaryPopulation"`
	ControlPopulation []string            `json:"controlPopulation"`
	Thresholds        GuardrailThresholds `json:"thresholds"`
	CreatedAt         time.Time           `json:"createdAt"`
	Signature         string              `json:"signature"`
}

func (m *RolloutManifest) Normalize() {
	sort.Strings(m.CanaryPopulation)
	sort.Strings(m.ControlPopulation)
}

func (m RolloutManifest) payloadForSignature() ([]byte, error) {
	payload := struct {
		ID                string              `json:"id"`
		PolicyVersion     string              `json:"policyVersion"`
		CanaryPopulation  []string            `json:"canaryPopulation"`
		ControlPopulation []string            `json:"controlPopulation"`
		Thresholds        GuardrailThresholds `json:"thresholds"`
		CreatedAt         time.Time           `json:"createdAt"`
	}{
		ID:                m.ID,
		PolicyVersion:     m.PolicyVersion,
		CanaryPopulation:  append([]string{}, m.CanaryPopulation...),
		ControlPopulation: append([]string{}, m.ControlPopulation...),
		Thresholds:        m.Thresholds,
		CreatedAt:         m.CreatedAt,
	}
	return json.Marshal(payload)
}

func (m RolloutManifest) ComputeSignature(secret string) (string, error) {
	if secret == "" {
		return "", errors.New("manifest signing secret must not be empty")
	}
	payload, err := m.payloadForSignature()
	if err != nil {
		return "", err
	}
	mac := hmac.New(sha256.New, []byte(secret))
	if _, err := mac.Write(payload); err != nil {
		return "", err
	}
	return hex.EncodeToString(mac.Sum(nil)), nil
}

func (m RolloutManifest) VerifySignature(secret string) error {
	expected, err := m.ComputeSignature(secret)
	if err != nil {
		return err
	}
	if !hmac.Equal([]byte(expected), []byte(strings.ToLower(m.Signature))) {
		return errors.New("manifest signature verification failed")
	}
	return nil
}
