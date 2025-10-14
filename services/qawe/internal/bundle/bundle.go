package bundle

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"
)

// ApprovalRecord is a single signed approval entry.
type ApprovalRecord struct {
	PrincipalID   string    `json:"principalId"`
	ActorID       string    `json:"actorId"`
	DelegatedFrom string    `json:"delegatedFrom,omitempty"`
	Payload       string    `json:"payload"`
	Signature     string    `json:"signature"`
	SignedAt      time.Time `json:"signedAt"`
}

// ApprovalBundle aggregates multiple approvals and is signed by the server so
// that it can be verified offline.
type ApprovalBundle struct {
	InstanceID      string           `json:"instanceId"`
	WorkflowID      string           `json:"workflowId"`
	StageID         string           `json:"stageId"`
	GateID          string           `json:"gateId"`
	Quorum          int              `json:"quorum"`
	Approvals       []ApprovalRecord `json:"approvals"`
	IssuedAt        time.Time        `json:"issuedAt"`
	ServerSignature string           `json:"serverSignature"`
	ServerPublicKey string           `json:"serverPublicKey"`
}

// New creates a bundle and signs it using the provided server key pair.
func New(instanceID, workflowID, stageID, gateID string, quorum int, approvals []ApprovalRecord, issuedAt time.Time, priv ed25519.PrivateKey, pub ed25519.PublicKey) (ApprovalBundle, error) {
	bundle := ApprovalBundle{
		InstanceID:      instanceID,
		WorkflowID:      workflowID,
		StageID:         stageID,
		GateID:          gateID,
		Quorum:          quorum,
		Approvals:       approvals,
		IssuedAt:        issuedAt.UTC(),
		ServerPublicKey: base64.StdEncoding.EncodeToString(pub),
	}
	payload, err := bundle.payload()
	if err != nil {
		return ApprovalBundle{}, err
	}
	signature := ed25519.Sign(priv, payload)
	bundle.ServerSignature = base64.StdEncoding.EncodeToString(signature)
	return bundle, nil
}

func (b ApprovalBundle) payload() ([]byte, error) {
	body := map[string]any{
		"instanceId": b.InstanceID,
		"workflowId": b.WorkflowID,
		"stageId":    b.StageID,
		"gateId":     b.GateID,
		"quorum":     b.Quorum,
		"approvals":  b.Approvals,
		"issuedAt":   b.IssuedAt.UTC().Format(time.RFC3339Nano),
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	sum := sha256.Sum256(raw)
	return sum[:], nil
}

// VerifyServerSignature ensures the bundle signature matches the provided
// public key.
func VerifyServerSignature(b ApprovalBundle, pub ed25519.PublicKey) error {
	if len(pub) == 0 {
		return errors.New("server public key is required")
	}
	payload, err := b.payload()
	if err != nil {
		return err
	}
	sigBytes, err := base64.StdEncoding.DecodeString(b.ServerSignature)
	if err != nil {
		return err
	}
	if !ed25519.Verify(pub, payload, sigBytes) {
		return errors.New("bundle signature verification failed")
	}
	return nil
}
