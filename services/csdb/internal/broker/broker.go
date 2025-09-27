package broker

import (
	"context"
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/summit-platform/csdb/internal/crypto"
	"github.com/summit-platform/csdb/internal/data"
)

const tokenizationKey = "csdb-tokenization-secret-v1"

var (
	ErrUnknownPartner   = errors.New("partner is not registered with CSDB")
	ErrMissingPurpose   = errors.New("purpose is required")
	ErrMissingPartnerID = errors.New("partnerId is required")
	ErrInvalidPublicKey = errors.New("manifest verification requires a 32 byte ed25519 public key")
)

type ExportRequest struct {
	PartnerID    string `json:"partnerId"`
	Purpose      string `json:"purpose"`
	Jurisdiction string `json:"jurisdiction"`
	DryRun       bool   `json:"dryRun"`
}

type ExportFilters struct {
	Purpose      string `json:"purpose"`
	Jurisdiction string `json:"jurisdiction"`
	DryRun       bool   `json:"dryRun"`
}

type SanitizedRecord struct {
	ID         string    `json:"id"`
	Dataset    string    `json:"dataset"`
	FullName   string    `json:"fullName"`
	Region     string    `json:"region"`
	EmailToken string    `json:"emailToken"`
	SSN        string    `json:"ssn"`
	CapturedAt time.Time `json:"capturedAt"`
}

type RecordProof struct {
	RecordID string `json:"recordId"`
	Hash     string `json:"hash"`
}

type DatasetManifest struct {
	Name        string        `json:"name"`
	RecordCount int           `json:"recordCount"`
	Proofs      []RecordProof `json:"proofs"`
	Transforms  []string      `json:"transforms"`
}

type ExportManifest struct {
	ID             string            `json:"id"`
	PartnerID      string            `json:"partnerId"`
	GeneratedAt    time.Time         `json:"generatedAt"`
	Filters        ExportFilters     `json:"filters"`
	ProofAlgorithm string            `json:"proofAlgorithm"`
	Datasets       []DatasetManifest `json:"datasets"`
	Signature      string            `json:"signature"`
}

type ExportResult struct {
	ExportID string            `json:"exportId"`
	Records  []SanitizedRecord `json:"records"`
	Manifest ExportManifest    `json:"manifest"`
	Preview  bool              `json:"preview"`
}

type Attestation struct {
	PartnerID string    `json:"partnerId"`
	Statement string    `json:"statement"`
	Timestamp time.Time `json:"timestamp"`
	Nonce     string    `json:"nonce"`
	Signature string    `json:"signature"`
}

type AttestationResult struct {
	PartnerID string `json:"partnerId"`
	Valid     bool   `json:"valid"`
	Reason    string `json:"reason,omitempty"`
}

type Broker struct {
	records         []data.DataRecord
	manifestSigners map[string]*crypto.ManifestSigner
	attestationKeys map[string]ed25519.PublicKey
	manifests       map[string]ExportManifest
	mu              sync.RWMutex
}

func NewBroker(fixtures []data.DataRecord, partners []data.Partner) (*Broker, error) {
	recordCopy := make([]data.DataRecord, len(fixtures))
	copy(recordCopy, fixtures)

	manifestSigners := make(map[string]*crypto.ManifestSigner)
	attestationKeys := make(map[string]ed25519.PublicKey)

	for _, partner := range partners {
		if len(partner.ManifestPrivateKey) > 0 {
			signer, err := crypto.NewManifestSigner(partner.ManifestPrivateKey, partner.ManifestPublicKey)
			if err != nil {
				return nil, fmt.Errorf("manifest signer init failed for %s: %w", partner.ID, err)
			}
			manifestSigners[partner.ID] = signer
		}
		if len(partner.AttestationPublicKey) == ed25519.PublicKeySize {
			key := ed25519.PublicKey(make([]byte, ed25519.PublicKeySize))
			copy(key, partner.AttestationPublicKey)
			attestationKeys[partner.ID] = key
		}
	}

	return &Broker{
		records:         recordCopy,
		manifestSigners: manifestSigners,
		attestationKeys: attestationKeys,
		manifests:       make(map[string]ExportManifest),
	}, nil
}

func (b *Broker) CreateExport(ctx context.Context, req ExportRequest) (ExportResult, error) {
	partnerID := strings.TrimSpace(req.PartnerID)
	if partnerID == "" {
		return ExportResult{}, ErrMissingPartnerID
	}
	purpose := strings.ToLower(strings.TrimSpace(req.Purpose))
	if purpose == "" {
		return ExportResult{}, ErrMissingPurpose
	}
	jurisdiction := strings.TrimSpace(req.Jurisdiction)

	signer, ok := b.manifestSigners[partnerID]
	if !ok {
		return ExportResult{}, ErrUnknownPartner
	}

	normalized := req
	normalized.PartnerID = partnerID
	normalized.Purpose = purpose
	normalized.Jurisdiction = jurisdiction

	records := b.filterRecords(normalized)
	sanitized := make([]SanitizedRecord, 0, len(records))
	proofs := make([]RecordProof, 0, len(records))

	for _, record := range records {
		sr := sanitizeRecord(record)
		sanitized = append(sanitized, sr)
		proof, err := buildProof(sr)
		if err != nil {
			return ExportResult{}, err
		}
		proofs = append(proofs, proof)
	}

	manifest := ExportManifest{
		ID:             uuid.NewString(),
		PartnerID:      partnerID,
		GeneratedAt:    time.Now().UTC().Round(time.Millisecond),
		Filters:        ExportFilters{Purpose: purpose, Jurisdiction: jurisdiction, DryRun: req.DryRun},
		ProofAlgorithm: "sha256(record-json)",
		Datasets: []DatasetManifest{
			{
				Name:        "contacts",
				RecordCount: len(proofs),
				Proofs:      proofs,
				Transforms: []string{
					"ssn:redacted",
					"email:tokenized-hmac-sha256",
				},
			},
		},
	}

	bytesToSign, err := manifest.signableBytes()
	if err != nil {
		return ExportResult{}, err
	}

	signature, err := signer.Sign(bytesToSign)
	if err != nil {
		return ExportResult{}, err
	}
	manifest.Signature = signature

	result := ExportResult{
		ExportID: manifest.ID,
		Records:  sanitized,
		Manifest: manifest,
		Preview:  req.DryRun,
	}

	if !req.DryRun {
		b.mu.Lock()
		b.manifests[manifest.ID] = manifest
		b.mu.Unlock()
	}

	return result, nil
}

func (b *Broker) PreviewExport(ctx context.Context, req ExportRequest) (ExportResult, error) {
	req.DryRun = true
	return b.CreateExport(ctx, req)
}

func (b *Broker) GetManifest(id string) (ExportManifest, bool) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	manifest, ok := b.manifests[id]
	return manifest, ok
}

func (b *Broker) ValidateAttestation(att Attestation) AttestationResult {
	key, ok := b.attestationKeys[att.PartnerID]
	if !ok {
		return AttestationResult{PartnerID: att.PartnerID, Valid: false, Reason: "partner is not registered"}
	}

	payload := buildAttestationPayload(att)
	sig, err := base64.StdEncoding.DecodeString(att.Signature)
	if err != nil {
		return AttestationResult{PartnerID: att.PartnerID, Valid: false, Reason: "invalid signature encoding"}
	}

	valid := ed25519.Verify(key, payload, sig)
	reason := ""
	if !valid {
		reason = "signature verification failed"
	}
	return AttestationResult{PartnerID: att.PartnerID, Valid: valid, Reason: reason}
}

func (b *Broker) filterRecords(req ExportRequest) []data.DataRecord {
	matched := make([]data.DataRecord, 0)
	for _, record := range b.records {
		if record.PartnerID != req.PartnerID {
			continue
		}
		if consent, ok := record.Consents[strings.ToLower(req.Purpose)]; !ok || !consent {
			continue
		}
		if req.Jurisdiction != "" && !containsCaseInsensitive(record.Jurisdictions, req.Jurisdiction) {
			continue
		}
		matched = append(matched, record)
	}
	sort.SliceStable(matched, func(i, j int) bool {
		if matched[i].CapturedAt.Equal(matched[j].CapturedAt) {
			return matched[i].ID < matched[j].ID
		}
		return matched[i].CapturedAt.Before(matched[j].CapturedAt)
	})
	return matched
}

func sanitizeRecord(record data.DataRecord) SanitizedRecord {
	return SanitizedRecord{
		ID:         record.ID,
		Dataset:    record.Dataset,
		FullName:   record.Payload.FullName,
		Region:     record.Payload.Region,
		EmailToken: tokenize(record.Payload.Email),
		SSN:        "[REDACTED]",
		CapturedAt: record.CapturedAt,
	}
}

func tokenize(value string) string {
	mac := hmac.New(sha256.New, []byte(tokenizationKey))
	mac.Write([]byte(strings.ToLower(strings.TrimSpace(value))))
	return hex.EncodeToString(mac.Sum(nil))
}

func buildProof(record SanitizedRecord) (RecordProof, error) {
	payload, err := json.Marshal(record)
	if err != nil {
		return RecordProof{}, err
	}
	sum := sha256.Sum256(payload)
	return RecordProof{RecordID: record.ID, Hash: hex.EncodeToString(sum[:])}, nil
}

func (m ExportManifest) signableBytes() ([]byte, error) {
	clone := m
	clone.Signature = ""
	return json.Marshal(clone)
}

func VerifyManifest(manifest ExportManifest, publicKey []byte) (bool, error) {
	if len(publicKey) != ed25519.PublicKeySize {
		return false, ErrInvalidPublicKey
	}
	bytesToVerify, err := manifest.signableBytes()
	if err != nil {
		return false, err
	}
	sig, err := base64.StdEncoding.DecodeString(manifest.Signature)
	if err != nil {
		return false, err
	}
	return ed25519.Verify(publicKey, bytesToVerify, sig), nil
}

func containsCaseInsensitive(items []string, target string) bool {
	targetLower := strings.ToLower(target)
	for _, item := range items {
		if strings.ToLower(item) == targetLower {
			return true
		}
	}
	return false
}

func buildAttestationPayload(att Attestation) []byte {
	return []byte(strings.Join([]string{
		att.PartnerID,
		att.Statement,
		att.Timestamp.UTC().Format(time.RFC3339Nano),
		att.Nonce,
	}, "|"))
}
