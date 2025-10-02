package engine

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"testing"
	"time"

	"qawe/internal/bundle"
	"qawe/internal/policy"
)

func TestSequentialQuorumAndBundle(t *testing.T) {
	now := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	current := now
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate server key: %v", err)
	}
	eng := NewEngine(func() time.Time { return current }, priv, pub)

	legal, legalPrivs := buildRole(t, "legal", 3)
	workflow := WorkflowDefinition{
		Name:  "Test",
		Start: "stage-legal",
		Policy: policy.Policy{
			Roles: map[string]*policy.Role{
				"legal": legal,
			},
		},
		Stages: []StageDefinition{
			{
				ID:   "stage-legal",
				Kind: StageKindSequential,
				Gates: []GateDefinition{
					{ID: "g-legal", Role: "legal", Quorum: 2, ExpirySeconds: 120, AllowDelegates: false},
				},
			},
		},
	}
	created, err := eng.CreateWorkflow(workflow)
	if err != nil {
		t.Fatalf("create workflow: %v", err)
	}
	inst, err := eng.StartInstance(StartInstanceRequest{WorkflowID: created.ID})
	if err != nil {
		t.Fatalf("start instance: %v", err)
	}

	signedAt := current
	sig1 := signApproval(t, legalPrivs[0], inst.ID, "stage-legal", "g-legal", legal.Principals[0].ID, "", signedAt)
	bundleRes, err := eng.SubmitApproval(inst.ID, SubmitApprovalRequest{
		StageID:   "stage-legal",
		GateID:    "g-legal",
		ActorID:   legal.Principals[0].ID,
		Signature: sig1,
		SignedAt:  signedAt,
	})
	if err != nil {
		t.Fatalf("submit first approval: %v", err)
	}
	if bundleRes != nil {
		t.Fatalf("expected quorum not reached yet")
	}

	sig2 := signApproval(t, legalPrivs[1], inst.ID, "stage-legal", "g-legal", legal.Principals[1].ID, "", signedAt)
	bundleRes, err = eng.SubmitApproval(inst.ID, SubmitApprovalRequest{
		StageID:   "stage-legal",
		GateID:    "g-legal",
		ActorID:   legal.Principals[1].ID,
		Signature: sig2,
		SignedAt:  signedAt,
	})
	if err != nil {
		t.Fatalf("submit second approval: %v", err)
	}
	if bundleRes == nil {
		t.Fatalf("expected quorum bundle")
	}
	if err := bundle.VerifyServerSignature(*bundleRes, pub); err != nil {
		t.Fatalf("verify bundle: %v", err)
	}
	verifyApprovalSignatures(t, bundleRes.Approvals, legal.Principals, legalPrivs)

	snapshot, err := eng.GetInstance(inst.ID)
	if err != nil {
		t.Fatalf("get instance: %v", err)
	}
	if snapshot.Status != InstanceStatusCompleted {
		t.Fatalf("expected completed instance, got %s", snapshot.Status)
	}
	if len(snapshot.ApprovalBundles) != 1 {
		t.Fatalf("expected 1 approval bundle, got %d", len(snapshot.ApprovalBundles))
	}

	if _, err := eng.SubmitApproval(inst.ID, SubmitApprovalRequest{
		StageID:   "stage-legal",
		GateID:    "g-legal",
		ActorID:   legal.Principals[2].ID,
		Signature: sig2,
		SignedAt:  signedAt,
	}); err == nil {
		t.Fatalf("expected error when approving completed gate")
	}
}

func TestDelegationParallelAndConditional(t *testing.T) {
	now := time.Date(2024, 2, 1, 9, 0, 0, 0, time.UTC)
	current := now
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate server key: %v", err)
	}
	eng := NewEngine(func() time.Time { return current }, priv, pub)

	legalRole, legalPrivs := buildRole(t, "legal", 1)
	securityRole, _ := buildRole(t, "security", 1)
	delegatePub, delegatePriv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("delegate key: %v", err)
	}
	securityRole.Principals[0].Delegates = []*policy.Delegate{{
		ID:        "sec-delegate",
		Display:   "Security Delegate",
		PublicKey: base64.StdEncoding.EncodeToString(delegatePub),
	}}

	workflow := WorkflowDefinition{
		Name:  "Parallel",
		Start: "router",
		Policy: policy.Policy{
			Roles: map[string]*policy.Role{
				"legal":    legalRole,
				"security": securityRole,
			},
		},
		Stages: []StageDefinition{
			{
				ID:   "router",
				Kind: StageKindConditional,
				Branches: []BranchDefinition{
					{Condition: Condition{Field: "risk", Equals: "high"}, Next: []string{"parallel"}},
				},
				Next: []string{"low"},
			},
			{
				ID:   "parallel",
				Kind: StageKindParallel,
				Gates: []GateDefinition{
					{ID: "g-legal", Role: "legal", Quorum: 1, ExpirySeconds: 60},
					{ID: "g-security", Role: "security", Quorum: 1, ExpirySeconds: 60, AllowDelegates: true},
				},
				Next: []string{"final"},
			},
			{
				ID:    "low",
				Kind:  StageKindSequential,
				Gates: []GateDefinition{{ID: "g-low", Role: "legal", Quorum: 1, ExpirySeconds: 60}},
				Next:  []string{"final"},
			},
			{
				ID:    "final",
				Kind:  StageKindSequential,
				Gates: []GateDefinition{{ID: "g-final", Role: "legal", Quorum: 1, ExpirySeconds: 60}},
			},
		},
	}
	created, err := eng.CreateWorkflow(workflow)
	if err != nil {
		t.Fatalf("create workflow: %v", err)
	}

	inst, err := eng.StartInstance(StartInstanceRequest{WorkflowID: created.ID, Context: map[string]string{"risk": "high"}})
	if err != nil {
		t.Fatalf("start instance: %v", err)
	}

	signedAt := current
	sigLegal := signApproval(t, legalPrivs[0], inst.ID, "parallel", "g-legal", legalRole.Principals[0].ID, "", signedAt)
	if _, err := eng.SubmitApproval(inst.ID, SubmitApprovalRequest{
		StageID:   "parallel",
		GateID:    "g-legal",
		ActorID:   legalRole.Principals[0].ID,
		Signature: sigLegal,
		SignedAt:  signedAt,
	}); err != nil {
		t.Fatalf("legal approval: %v", err)
	}

	sigDelegate := signApproval(t, delegatePriv, inst.ID, "parallel", "g-security", "sec-delegate", securityRole.Principals[0].ID, signedAt)
	bundleRes, err := eng.SubmitApproval(inst.ID, SubmitApprovalRequest{
		StageID:       "parallel",
		GateID:        "g-security",
		ActorID:       "sec-delegate",
		DelegatedFrom: securityRole.Principals[0].ID,
		Signature:     sigDelegate,
		SignedAt:      signedAt,
	})
	if err != nil {
		t.Fatalf("delegate approval: %v", err)
	}
	if bundleRes == nil {
		t.Fatalf("expected bundle for security gate")
	}

	sigFinal := signApproval(t, legalPrivs[0], inst.ID, "final", "g-final", legalRole.Principals[0].ID, "", signedAt)
	finalBundle, err := eng.SubmitApproval(inst.ID, SubmitApprovalRequest{
		StageID:   "final",
		GateID:    "g-final",
		ActorID:   legalRole.Principals[0].ID,
		Signature: sigFinal,
		SignedAt:  signedAt,
	})
	if err != nil {
		t.Fatalf("final approval: %v", err)
	}
	if finalBundle == nil {
		t.Fatalf("final gate should complete with bundle")
	}
}

func TestExpiryDeterministicFailure(t *testing.T) {
	now := time.Date(2024, 3, 1, 8, 0, 0, 0, time.UTC)
	current := now
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("server key: %v", err)
	}
	eng := NewEngine(func() time.Time { return current }, priv, pub)

	legalRole, legalPrivs := buildRole(t, "legal", 1)
	workflow := WorkflowDefinition{
		Name:   "Expiry",
		Start:  "stage",
		Policy: policy.Policy{Roles: map[string]*policy.Role{"legal": legalRole}},
		Stages: []StageDefinition{{
			ID:    "stage",
			Kind:  StageKindSequential,
			Gates: []GateDefinition{{ID: "gate", Role: "legal", Quorum: 1, ExpirySeconds: 1}},
		}},
	}
	created, err := eng.CreateWorkflow(workflow)
	if err != nil {
		t.Fatalf("create workflow: %v", err)
	}
	inst, err := eng.StartInstance(StartInstanceRequest{WorkflowID: created.ID})
	if err != nil {
		t.Fatalf("start instance: %v", err)
	}

	current = current.Add(2 * time.Second)
	sig := signApproval(t, legalPrivs[0], inst.ID, "stage", "gate", legalRole.Principals[0].ID, "", current)
	if _, err := eng.SubmitApproval(inst.ID, SubmitApprovalRequest{
		StageID:   "stage",
		GateID:    "gate",
		ActorID:   legalRole.Principals[0].ID,
		Signature: sig,
		SignedAt:  current,
	}); err == nil {
		t.Fatalf("expected error due to expiry")
	}
	snapshot, err := eng.GetInstance(inst.ID)
	if err != nil {
		t.Fatalf("get instance: %v", err)
	}
	if snapshot.Status != InstanceStatusExpired {
		t.Fatalf("expected expired status, got %s", snapshot.Status)
	}
}

func signApproval(t *testing.T, priv ed25519.PrivateKey, instanceID, stageID, gateID, actorID, delegatedFrom string, signedAt time.Time) string {
	t.Helper()
	message := canonicalApprovalMessage(instanceID, stageID, gateID, actorID, delegatedFrom, signedAt)
	sig := ed25519.Sign(priv, []byte(message))
	return base64.StdEncoding.EncodeToString(sig)
}

func buildRole(t *testing.T, id string, count int) (*policy.Role, []ed25519.PrivateKey) {
	t.Helper()
	principals := make([]*policy.Principal, 0, count)
	privs := make([]ed25519.PrivateKey, 0, count)
	for i := 0; i < count; i++ {
		pub, priv, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			t.Fatalf("generate key: %v", err)
		}
		principals = append(principals, &policy.Principal{
			ID:        id + "-" + string(rune('a'+i)),
			Display:   "Principal " + string(rune('A'+i)),
			PublicKey: base64.StdEncoding.EncodeToString(pub),
		})
		privs = append(privs, priv)
	}
	return &policy.Role{ID: id, Name: id, Principals: principals}, privs
}

func verifyApprovalSignatures(t *testing.T, approvals []bundle.ApprovalRecord, principals []*policy.Principal, privs []ed25519.PrivateKey) {
	t.Helper()
	keyMap := make(map[string]ed25519.PublicKey)
	for i, principal := range principals {
		keyMap[principal.ID] = privs[i].Public().(ed25519.PublicKey)
	}
	for _, approval := range approvals {
		pub, ok := keyMap[approval.ActorID]
		if !ok {
			t.Fatalf("missing public key for %s", approval.ActorID)
		}
		sigBytes, err := base64.StdEncoding.DecodeString(approval.Signature)
		if err != nil {
			t.Fatalf("decode signature: %v", err)
		}
		if !ed25519.Verify(pub, []byte(approval.Payload), sigBytes) {
			t.Fatalf("invalid signature for %s", approval.ActorID)
		}
	}
}
