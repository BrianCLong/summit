package service

import (
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/summit-hq/coec/internal/aggregation"
	"github.com/summit-hq/coec/internal/models"
	"github.com/summit-hq/coec/internal/vrf"
)

// Manager orchestrates experiment coordination lifecycles.
type Manager struct {
	mu          sync.RWMutex
	experiments map[string]*models.ExperimentState
}

// NewManager constructs a manager with in-memory storage.
func NewManager() *Manager {
	return &Manager{experiments: make(map[string]*models.ExperimentState)}
}

// CreateExperiment registers a new experiment and prepares the secure aggregation state.
func (m *Manager) CreateExperiment(cfg models.ExperimentConfig) (models.ExperimentConfig, string, map[string]string, error) {
	if len(cfg.Cohorts) == 0 {
		return models.ExperimentConfig{}, "", nil, errors.New("at least one cohort required")
	}
	var total float64
	for _, cohort := range cfg.Cohorts {
		if cohort.Fraction <= 0 {
			return models.ExperimentConfig{}, "", nil, fmt.Errorf("cohort %s has invalid fraction", cohort.Name)
		}
		total += cohort.Fraction
	}
	if total > 1.0001 {
		return models.ExperimentConfig{}, "", nil, errors.New("cohort fractions must sum to <= 1")
	}
	secret, err := decodeOrGenerateSecret(cfg.VRFKey)
	if err != nil {
		return models.ExperimentConfig{}, "", nil, err
	}
	if cfg.ID == "" {
		cfg.ID = uuid.NewString()
	}
	cfg.VRFKey = ""
	seed := sha512.Sum512(secret)
	aggState := aggregation.NewState(cfg.Metrics, cfg.DPConfig, seed[:])
	orgPriv := make(map[string]ed25519.PrivateKey)
	orgPub := make(map[string]ed25519.PublicKey)
	for _, org := range cfg.Organisations {
		pub, priv := deriveOrgKey(secret, org.OrgID)
		orgPriv[org.OrgID] = priv
		orgPub[org.OrgID] = pub
	}
	state := &models.ExperimentState{
		Config:        cfg,
		VRFSecret:     secret,
		Seed:          seed[:],
		CreatedAt:     time.Now().UTC(),
		Aggregator:    aggState,
		OrgPrivateKey: orgPriv,
		OrgPublicKey:  orgPub,
		Prereg:        []models.PreregistrationHook{},
		Certificates:  []models.SamplingCertificate{},
		Briefs:        make(map[string]models.ResultBrief),
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.experiments[cfg.ID]; exists {
		return models.ExperimentConfig{}, "", nil, errors.New("experiment already exists")
	}
	m.experiments[cfg.ID] = state
	publicKeyMap := make(map[string]string)
	for orgID, pub := range orgPub {
		publicKeyMap[orgID] = base64.StdEncoding.EncodeToString(pub)
	}
	return cfg, base64.StdEncoding.EncodeToString(secret), publicKeyMap, nil
}

// AssignmentResponse describes the deterministic cohort assignment for a subject.
type AssignmentResponse struct {
	Cohort string     `json:"cohort"`
	VRF    vrf.Result `json:"vrf"`
}

// AssignCohort returns the deterministic cohort assignment for a subject if eligible.
func (m *Manager) AssignCohort(experimentID, subjectID string, attributes map[string]interface{}) (AssignmentResponse, error) {
	state, err := m.getExperiment(experimentID)
	if err != nil {
		return AssignmentResponse{}, err
	}
	if !state.Config.EligibilityFilter.Evaluate(attributes) {
		return AssignmentResponse{}, errors.New("subject not eligible")
	}
	eval := vrf.NewEvaluator(state.VRFSecret)
	result := eval.Evaluate(experimentID + ":" + subjectID)
	rnd := result.Fraction()
	var cumulative float64
	var selected string
	for _, cohort := range state.Config.Cohorts {
		cumulative += cohort.Fraction
		if rnd <= cumulative {
			selected = cohort.Name
			break
		}
	}
	if selected == "" {
		selected = state.Config.Cohorts[len(state.Config.Cohorts)-1].Name
	}
	return AssignmentResponse{Cohort: selected, VRF: result}, nil
}

// RecordPreregistration stores preregistration metadata for compliance.
func (m *Manager) RecordPreregistration(experimentID string, hook models.PreregistrationHook) (models.PreregistrationHook, error) {
	state, err := m.getExperiment(experimentID)
	if err != nil {
		return models.PreregistrationHook{}, err
	}
	hook.CreatedAt = time.Now().UTC()
	state.Prereg = append(state.Prereg, hook)
	return hook, nil
}

// IssueSamplingCertificate generates a CCS sampling certificate for auditability.
func (m *Manager) IssueSamplingCertificate(experimentID string, cert models.SamplingCertificate) (models.SamplingCertificate, error) {
	state, err := m.getExperiment(experimentID)
	if err != nil {
		return models.SamplingCertificate{}, err
	}
	if cert.SampleSize <= 0 {
		return models.SamplingCertificate{}, errors.New("sample size must be positive")
	}
	cert.ExperimentID = experimentID
	cert.IssuedAt = time.Now().UTC()
	digest := hmac.New(sha512.New, state.VRFSecret)
	digest.Write([]byte(experimentID))
	digest.Write([]byte(cert.OrgID))
	digest.Write([]byte(cert.Cohort))
	digest.Write([]byte(strconv.Itoa(cert.SampleSize)))
	digest.Write([]byte(cert.Seed))
	cert.Digest = base64.StdEncoding.EncodeToString(digest.Sum(nil))
	state.Certificates = append(state.Certificates, cert)
	return cert, nil
}

// SubmitContribution ingests masked KPI aggregates from an organisation.
func (m *Manager) SubmitContribution(experimentID string, contribution aggregation.Contribution) error {
	state, err := m.getExperiment(experimentID)
	if err != nil {
		return err
	}
	return state.Aggregator.ApplyContribution(contribution)
}

// FinaliseExperiment snapshots aggregates, signs result briefs, and prevents further mutation.
func (m *Manager) FinaliseExperiment(experimentID string) ([]models.ResultBrief, error) {
	state, err := m.getExperiment(experimentID)
	if err != nil {
		return nil, err
	}
	if state.Completed {
		briefs := make([]models.ResultBrief, 0, len(state.Briefs))
		for _, brief := range state.Briefs {
			briefs = append(briefs, brief)
		}
		sort.Slice(briefs, func(i, j int) bool { return briefs[i].OrgID < briefs[j].OrgID })
		return briefs, nil
	}
	results, err := state.Aggregator.Snapshot(experimentID)
	if err != nil {
		return nil, err
	}
	briefs := make([]models.ResultBrief, 0, len(results))
	for _, result := range results {
		payload := struct {
			ExperimentID string                `json:"experimentId"`
			Result       aggregation.OrgResult `json:"result"`
			IssuedAt     time.Time             `json:"issuedAt"`
		}{
			ExperimentID: experimentID,
			Result:       result,
			IssuedAt:     time.Now().UTC(),
		}
		bytes, _ := json.Marshal(payload)
		priv := state.OrgPrivateKey[result.OrgID]
		pub := state.OrgPublicKey[result.OrgID]
		signature := ed25519.Sign(priv, bytes)
		certs := filterCertificates(state.Certificates, result.OrgID)
		prereg := filterPrereg(state.Prereg, result.OrgID)
		brief := models.ResultBrief{
			ExperimentID: experimentID,
			OrgID:        result.OrgID,
			Results:      result,
			Certificates: certs,
			Prereg:       prereg,
			SignedAt:     payload.IssuedAt,
			Signature:    base64.StdEncoding.EncodeToString(signature),
			PublicKey:    pub,
		}
		state.Briefs[result.OrgID] = brief
		briefs = append(briefs, brief)
	}
	sort.Slice(briefs, func(i, j int) bool { return briefs[i].OrgID < briefs[j].OrgID })
	state.Completed = true
	return briefs, nil
}

// GetBrief returns the signed result brief for a specific organisation.
func (m *Manager) GetBrief(experimentID, orgID string) (models.ResultBrief, error) {
	state, err := m.getExperiment(experimentID)
	if err != nil {
		return models.ResultBrief{}, err
	}
	brief, ok := state.Briefs[orgID]
	if !ok {
		return models.ResultBrief{}, errors.New("brief not available; finalise experiment first")
	}
	return brief, nil
}

func (m *Manager) getExperiment(id string) (*models.ExperimentState, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	state, ok := m.experiments[id]
	if !ok {
		return nil, errors.New("experiment not found")
	}
	return state, nil
}

func decodeOrGenerateSecret(vrfKey string) ([]byte, error) {
	if vrfKey != "" {
		secret, err := base64.StdEncoding.DecodeString(vrfKey)
		if err != nil {
			return nil, fmt.Errorf("invalid vrf key: %w", err)
		}
		if len(secret) < 32 {
			return nil, errors.New("vrf key must be at least 32 bytes")
		}
		return append([]byte(nil), secret[:32]...), nil
	}
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return nil, err
	}
	return secret, nil
}

func deriveOrgKey(secret []byte, orgID string) (ed25519.PublicKey, ed25519.PrivateKey) {
	h := sha512.New()
	h.Write(secret)
	h.Write([]byte(orgID))
	sum := h.Sum(nil)
	seed := sum[:32]
	priv := ed25519.NewKeyFromSeed(seed)
	pub := priv.Public().(ed25519.PublicKey)
	return pub, priv
}

func filterCertificates(all []models.SamplingCertificate, orgID string) []models.SamplingCertificate {
	out := make([]models.SamplingCertificate, 0)
	for _, cert := range all {
		if cert.OrgID == orgID {
			out = append(out, cert)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Cohort == out[j].Cohort {
			return out[i].IssuedAt.Before(out[j].IssuedAt)
		}
		return out[i].Cohort < out[j].Cohort
	})
	return out
}

func filterPrereg(all []models.PreregistrationHook, orgID string) []models.PreregistrationHook {
	out := make([]models.PreregistrationHook, 0)
	for _, hook := range all {
		if hook.OrgID == orgID {
			out = append(out, hook)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out
}
