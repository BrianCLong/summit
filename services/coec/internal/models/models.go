package models

import (
	"crypto/ed25519"
	"time"

	"github.com/summit-hq/coec/internal/aggregation"
	"github.com/summit-hq/coec/internal/eligibility"
)

// Cohort defines a traffic split for a given experiment arm.
type Cohort struct {
	Name     string  `json:"name"`
	Fraction float64 `json:"fraction"`
}

// OrgRegistration describes an organisation participating in the experiment.
type OrgRegistration struct {
	OrgID string `json:"orgId"`
}

// ExperimentConfig contains the data required to bootstrap an experiment.
type ExperimentConfig struct {
	ID                string                         `json:"id"`
	Description       string                         `json:"description"`
	VRFKey            string                         `json:"vrfKey,omitempty"`
	Cohorts           []Cohort                       `json:"cohorts"`
	EligibilityFilter eligibility.Filter             `json:"eligibilityFilter"`
	Metrics           []aggregation.MetricDefinition `json:"metrics"`
	DPConfig          *aggregation.DPConfig          `json:"dpConfig,omitempty"`
	Organisations     []OrgRegistration              `json:"organisations"`
}

// PreregistrationHook captures the preregistration payload from an organisation.
type PreregistrationHook struct {
	OrgID     string                 `json:"orgId"`
	Payload   map[string]interface{} `json:"payload"`
	CreatedAt time.Time              `json:"createdAt"`
}

// SamplingCertificate records cohort sampling attestation information.
type SamplingCertificate struct {
	ExperimentID string    `json:"experimentId"`
	OrgID        string    `json:"orgId"`
	Cohort       string    `json:"cohort"`
	SampleSize   int       `json:"sampleSize"`
	Seed         string    `json:"seed"`
	Digest       string    `json:"digest"`
	IssuedAt     time.Time `json:"issuedAt"`
}

// ResultBrief summarises experiment outcomes for a single organisation.
type ResultBrief struct {
	ExperimentID string                `json:"experimentId"`
	OrgID        string                `json:"orgId"`
	Results      aggregation.OrgResult `json:"results"`
	Certificates []SamplingCertificate `json:"certificates"`
	Prereg       []PreregistrationHook `json:"preregistrations"`
	SignedAt     time.Time             `json:"signedAt"`
	Signature    string                `json:"signature"`
	PublicKey    ed25519.PublicKey     `json:"publicKey"`
}

// ExperimentState is the in-memory representation managed by the service.
type ExperimentState struct {
	Config        ExperimentConfig
	VRFSecret     []byte
	Seed          []byte
	CreatedAt     time.Time
	Aggregator    *aggregation.State
	OrgPrivateKey map[string]ed25519.PrivateKey
	OrgPublicKey  map[string]ed25519.PublicKey
	Prereg        []PreregistrationHook
	Certificates  []SamplingCertificate
	Briefs        map[string]ResultBrief
	Completed     bool
}
