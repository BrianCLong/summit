package engine

import (
	"crypto/ed25519"
	"encoding/base64"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"

	"qawe/internal/bundle"
	"qawe/internal/policy"
)

// StageKind defines the execution behavior for a workflow stage.
type StageKind string

const (
	StageKindSequential  StageKind = "sequential"
	StageKindParallel    StageKind = "parallel"
	StageKindConditional StageKind = "conditional"
)

// GateDefinition describes a quorum gate that must be satisfied.
type GateDefinition struct {
	ID             string `json:"id"`
	Role           string `json:"role"`
	Quorum         int    `json:"quorum"`
	ExpirySeconds  int64  `json:"expirySeconds"`
	AllowDelegates bool   `json:"allowDelegates"`
}

// Condition is a simple equality expression evaluated against workflow context.
type Condition struct {
	Field  string `json:"field"`
	Equals string `json:"equals"`
}

// BranchDefinition routes execution to the provided stages when the condition matches the workflow context.
type BranchDefinition struct {
	Condition Condition `json:"condition"`
	Next      []string  `json:"next"`
}

// StageDefinition describes a unit of work inside a workflow.
type StageDefinition struct {
	ID       string             `json:"id"`
	Kind     StageKind          `json:"kind"`
	Gates    []GateDefinition   `json:"gates,omitempty"`
	Branches []BranchDefinition `json:"branches,omitempty"`
	Next     []string           `json:"next,omitempty"`
}

// WorkflowDefinition contains the complete structure for an approval workflow.
type WorkflowDefinition struct {
	ID     string            `json:"id"`
	Name   string            `json:"name"`
	Start  string            `json:"start"`
	Stages []StageDefinition `json:"stages"`
	Policy policy.Policy     `json:"policy"`
}

// StartInstanceRequest is the payload for creating a workflow instance.
type StartInstanceRequest struct {
	WorkflowID string            `json:"workflowId"`
	Context    map[string]string `json:"context"`
}

// SubmitApprovalRequest captures an approval for a given gate.
type SubmitApprovalRequest struct {
	StageID       string    `json:"stageId"`
	GateID        string    `json:"gateId"`
	ActorID       string    `json:"actorId"`
	DelegatedFrom string    `json:"delegatedFrom,omitempty"`
	Signature     string    `json:"signature"`
	SignedAt      time.Time `json:"signedAt"`
}

// InstanceStatus tracks lifecycle state for a workflow instance.
type InstanceStatus string

const (
	InstanceStatusPending   InstanceStatus = "pending"
	InstanceStatusActive    InstanceStatus = "active"
	InstanceStatusCompleted InstanceStatus = "completed"
	InstanceStatusExpired   InstanceStatus = "expired"
)

// StageStatus represents the final state for a stage.
type StageStatus string

const (
	StageStatusCompleted StageStatus = "completed"
	StageStatusExpired   StageStatus = "expired"
)

type workflow struct {
	definition *WorkflowDefinition
	stages     map[string]*StageDefinition
}

type stageRuntime struct {
	Definition *StageDefinition        `json:"definition"`
	Gates      map[string]*gateRuntime `json:"gates"`
	ActiveGate string                  `json:"activeGate,omitempty"`
	StartedAt  time.Time               `json:"startedAt"`
}

type gateRuntime struct {
	Definition         GateDefinition          `json:"definition"`
	Approvals          []bundle.ApprovalRecord `json:"approvals"`
	PrincipalApprovals map[string]struct{}     `json:"principalApprovals"`
	Satisfied          bool                    `json:"satisfied"`
	ExpiresAt          time.Time               `json:"expiresAt"`
	Bundle             *bundle.ApprovalBundle  `json:"bundle,omitempty"`
	Index              int                     `json:"index"`
}

// StageResult captures the terminal details for a stage.
type StageResult struct {
	StageID     string      `json:"stageId"`
	Status      StageStatus `json:"status"`
	CompletedAt time.Time   `json:"completedAt"`
}

// WorkflowInstance tracks runtime state.
type WorkflowInstance struct {
	ID              string                   `json:"id"`
	WorkflowID      string                   `json:"workflowId"`
	Context         map[string]string        `json:"context"`
	Status          InstanceStatus           `json:"status"`
	ActiveStages    map[string]*stageRuntime `json:"activeStages"`
	CompletedStages map[string]StageResult   `json:"completedStages"`
	ApprovalBundles []bundle.ApprovalBundle  `json:"approvalBundles"`
	CreatedAt       time.Time                `json:"createdAt"`
	UpdatedAt       time.Time                `json:"updatedAt"`
}

// Engine executes workflows and enforces quorum policies.
type Engine struct {
	mu         sync.RWMutex
	workflows  map[string]*workflow
	instances  map[string]*WorkflowInstance
	now        func() time.Time
	serverPriv ed25519.PrivateKey
	serverPub  ed25519.PublicKey
}

// NewEngine builds a new workflow engine.
func NewEngine(now func() time.Time, priv ed25519.PrivateKey, pub ed25519.PublicKey) *Engine {
	if now == nil {
		now = time.Now
	}
	return &Engine{
		workflows:  make(map[string]*workflow),
		instances:  make(map[string]*WorkflowInstance),
		now:        now,
		serverPriv: priv,
		serverPub:  pub,
	}
}

// CreateWorkflow registers a new workflow definition.
func (e *Engine) CreateWorkflow(def WorkflowDefinition) (*WorkflowDefinition, error) {
	if def.Start == "" {
		return nil, errors.New("workflow start stage is required")
	}
	if len(def.Stages) == 0 {
		return nil, errors.New("workflow must define at least one stage")
	}
	if err := def.Policy.Validate(); err != nil {
		return nil, err
	}
	stageMap := make(map[string]*StageDefinition)
	for i := range def.Stages {
		stage := &def.Stages[i]
		if stage.ID == "" {
			return nil, fmt.Errorf("stage at index %d is missing an id", i)
		}
		if _, exists := stageMap[stage.ID]; exists {
			return nil, fmt.Errorf("duplicate stage id %s", stage.ID)
		}
		switch stage.Kind {
		case StageKindSequential, StageKindParallel, StageKindConditional:
		default:
			return nil, fmt.Errorf("stage %s has unsupported kind %s", stage.ID, stage.Kind)
		}
		for j, gate := range stage.Gates {
			if gate.ID == "" {
				return nil, fmt.Errorf("stage %s gate %d missing id", stage.ID, j)
			}
			if gate.Quorum <= 0 {
				return nil, fmt.Errorf("gate %s quorum must be >0", gate.ID)
			}
			if gate.Role == "" {
				return nil, fmt.Errorf("gate %s missing role", gate.ID)
			}
		}
		stageMap[stage.ID] = stage
	}
	if _, ok := stageMap[def.Start]; !ok {
		return nil, fmt.Errorf("start stage %s does not exist", def.Start)
	}
	if def.ID == "" {
		def.ID = uuid.NewString()
	}
	wf := &workflow{definition: &def, stages: stageMap}
	e.mu.Lock()
	defer e.mu.Unlock()
	e.workflows[def.ID] = wf
	return wf.definition, nil
}

// StartInstance creates a new instance from the workflow definition.
func (e *Engine) StartInstance(req StartInstanceRequest) (*WorkflowInstance, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	wf, ok := e.workflows[req.WorkflowID]
	if !ok {
		return nil, errors.New("workflow not found")
	}
	instance := &WorkflowInstance{
		ID:              uuid.NewString(),
		WorkflowID:      req.WorkflowID,
		Context:         make(map[string]string),
		Status:          InstanceStatusPending,
		ActiveStages:    make(map[string]*stageRuntime),
		CompletedStages: make(map[string]StageResult),
		CreatedAt:       e.now(),
		UpdatedAt:       e.now(),
	}
	for k, v := range req.Context {
		instance.Context[k] = v
	}
	if err := e.activateStage(instance, wf, wf.definition.Start); err != nil {
		return nil, err
	}
	if instance.Status != InstanceStatusCompleted && len(instance.ActiveStages) == 0 {
		instance.Status = InstanceStatusCompleted
	} else {
		instance.Status = InstanceStatusActive
	}
	e.instances[instance.ID] = instance
	return instance, nil
}

// GetInstance retrieves the workflow instance by ID.
func (e *Engine) GetInstance(id string) (*WorkflowInstance, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	inst, ok := e.instances[id]
	if !ok {
		return nil, errors.New("instance not found")
	}
	return cloneInstance(inst), nil
}

// SubmitApproval records an approval for the specified gate.
func (e *Engine) SubmitApproval(instanceID string, req SubmitApprovalRequest) (*bundle.ApprovalBundle, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	inst, ok := e.instances[instanceID]
	if !ok {
		return nil, errors.New("instance not found")
	}
	if inst.Status == InstanceStatusCompleted {
		return nil, errors.New("instance already completed")
	}
	if inst.Status == InstanceStatusExpired {
		return nil, errors.New("instance expired")
	}
	wf := e.workflows[inst.WorkflowID]
	stageRuntime, ok := inst.ActiveStages[req.StageID]
	if !ok {
		return nil, errors.New("stage is not active")
	}
	gateRuntime, ok := stageRuntime.Gates[req.GateID]
	if !ok {
		return nil, errors.New("gate not found")
	}
	if gateRuntime.Satisfied {
		return nil, errors.New("gate already satisfied")
	}
	if stageRuntime.Definition.Kind == StageKindSequential && stageRuntime.ActiveGate != gateRuntime.Definition.ID {
		return nil, errors.New("gate not currently active in sequential stage")
	}
	now := e.now()
	if !gateRuntime.ExpiresAt.IsZero() && now.After(gateRuntime.ExpiresAt) {
		inst.Status = InstanceStatusExpired
		inst.UpdatedAt = now
		e.markStageExpired(inst, req.StageID)
		return nil, errors.New("gate expired")
	}
	principal, actorKey, pubKey, err := wf.definition.Policy.ResolveActor(gateRuntime.Definition.Role, req.ActorID, req.DelegatedFrom)
	if err != nil {
		return nil, err
	}
	if req.DelegatedFrom != "" {
		if !gateRuntime.Definition.AllowDelegates {
			return nil, errors.New("delegation is not allowed for this gate")
		}
		if principal.ID != req.DelegatedFrom {
			return nil, errors.New("delegatedFrom does not match a principal")
		}
	} else if actorKey != principal.ID {
		return nil, errors.New("delegation must specify delegatedFrom")
	}
	message := canonicalApprovalMessage(instanceID, req.StageID, req.GateID, req.ActorID, req.DelegatedFrom, req.SignedAt)
	sigBytes, err := base64.StdEncoding.DecodeString(req.Signature)
	if err != nil {
		return nil, err
	}
	if !ed25519.Verify(pubKey, []byte(message), sigBytes) {
		return nil, errors.New("approval signature verification failed")
	}
	if gateRuntime.PrincipalApprovals == nil {
		gateRuntime.PrincipalApprovals = make(map[string]struct{})
	}
	if _, exists := gateRuntime.PrincipalApprovals[principal.ID]; exists {
		return nil, errors.New("principal already satisfied the quorum")
	}
	record := bundle.ApprovalRecord{
		PrincipalID:   principal.ID,
		ActorID:       actorKey,
		DelegatedFrom: req.DelegatedFrom,
		Payload:       message,
		Signature:     req.Signature,
		SignedAt:      req.SignedAt.UTC(),
	}
	gateRuntime.Approvals = append(gateRuntime.Approvals, record)
	gateRuntime.PrincipalApprovals[principal.ID] = struct{}{}
	inst.UpdatedAt = now
	var bundleResult *bundle.ApprovalBundle
	if len(gateRuntime.PrincipalApprovals) >= gateRuntime.Definition.Quorum {
		approvalBundle, err := bundle.New(inst.ID, inst.WorkflowID, req.StageID, req.GateID, gateRuntime.Definition.Quorum, gateRuntime.Approvals, now, e.serverPriv, e.serverPub)
		if err != nil {
			return nil, err
		}
		gateRuntime.Satisfied = true
		gateRuntime.Bundle = &approvalBundle
		inst.ApprovalBundles = append(inst.ApprovalBundles, approvalBundle)
		bundleResult = gateRuntime.Bundle
		e.advanceStage(inst, wf, req.StageID)
	}
	return bundleResult, nil
}

func (e *Engine) advanceStage(inst *WorkflowInstance, wf *workflow, stageID string) {
	stageRuntime, ok := inst.ActiveStages[stageID]
	if !ok {
		return
	}
	stageDef := stageRuntime.Definition
	switch stageDef.Kind {
	case StageKindSequential:
		nextGate := ""
		for _, gate := range stageDef.Gates {
			state := stageRuntime.Gates[gate.ID]
			if !state.Satisfied {
				nextGate = gate.ID
				break
			}
		}
		if nextGate != "" {
			stageRuntime.ActiveGate = nextGate
			return
		}
		delete(inst.ActiveStages, stageID)
		e.markStageCompleted(inst, wf, stageID)
	case StageKindParallel:
		for _, state := range stageRuntime.Gates {
			if !state.Satisfied {
				return
			}
		}
		delete(inst.ActiveStages, stageID)
		e.markStageCompleted(inst, wf, stageID)
	}
}

func (e *Engine) markStageCompleted(inst *WorkflowInstance, wf *workflow, stageID string) {
	stageDef := wf.stages[stageID]
	inst.CompletedStages[stageID] = StageResult{
		StageID:     stageID,
		Status:      StageStatusCompleted,
		CompletedAt: e.now(),
	}
	for _, next := range stageDef.Next {
		_ = e.activateStage(inst, wf, next)
	}
	if len(inst.ActiveStages) == 0 && inst.Status != InstanceStatusExpired {
		inst.Status = InstanceStatusCompleted
		inst.UpdatedAt = e.now()
	}
}

func (e *Engine) markStageExpired(inst *WorkflowInstance, stageID string) {
	delete(inst.ActiveStages, stageID)
	inst.CompletedStages[stageID] = StageResult{
		StageID:     stageID,
		Status:      StageStatusExpired,
		CompletedAt: e.now(),
	}
	inst.UpdatedAt = e.now()
}

func (e *Engine) activateStage(inst *WorkflowInstance, wf *workflow, stageID string) error {
	if stageID == "" {
		return nil
	}
	if _, done := inst.CompletedStages[stageID]; done {
		return nil
	}
	if _, active := inst.ActiveStages[stageID]; active {
		return nil
	}
	stageDef, ok := wf.stages[stageID]
	if !ok {
		return fmt.Errorf("stage %s not found", stageID)
	}
	runtime := &stageRuntime{
		Definition: stageDef,
		Gates:      make(map[string]*gateRuntime),
		StartedAt:  e.now(),
	}
	switch stageDef.Kind {
	case StageKindConditional:
		matched := false
		for _, branch := range stageDef.Branches {
			if inst.Context[branch.Condition.Field] == branch.Condition.Equals {
				matched = true
				inst.CompletedStages[stageID] = StageResult{
					StageID:     stageID,
					Status:      StageStatusCompleted,
					CompletedAt: e.now(),
				}
				for _, next := range branch.Next {
					_ = e.activateStage(inst, wf, next)
				}
				break
			}
		}
		if !matched {
			if len(stageDef.Next) == 0 {
				return fmt.Errorf("no matching branch for conditional stage %s", stageID)
			}
			inst.CompletedStages[stageID] = StageResult{
				StageID:     stageID,
				Status:      StageStatusCompleted,
				CompletedAt: e.now(),
			}
			for _, next := range stageDef.Next {
				_ = e.activateStage(inst, wf, next)
			}
		}
		if len(inst.ActiveStages) == 0 && inst.Status != InstanceStatusExpired {
			inst.Status = InstanceStatusCompleted
		}
		return nil
	default:
		for idx, gate := range stageDef.Gates {
			var expiresAt time.Time
			if gate.ExpirySeconds > 0 {
				expiresAt = runtime.StartedAt.Add(time.Duration(gate.ExpirySeconds) * time.Second)
			}
			runtime.Gates[gate.ID] = &gateRuntime{
				Definition:         gate,
				PrincipalApprovals: make(map[string]struct{}),
				Index:              idx,
				ExpiresAt:          expiresAt,
			}
		}
		if stageDef.Kind == StageKindSequential && len(stageDef.Gates) > 0 {
			runtime.ActiveGate = stageDef.Gates[0].ID
		}
		inst.ActiveStages[stageID] = runtime
		if len(stageDef.Gates) == 0 {
			delete(inst.ActiveStages, stageID)
			inst.CompletedStages[stageID] = StageResult{
				StageID:     stageID,
				Status:      StageStatusCompleted,
				CompletedAt: e.now(),
			}
			for _, next := range stageDef.Next {
				_ = e.activateStage(inst, wf, next)
			}
			if len(inst.ActiveStages) == 0 && inst.Status != InstanceStatusExpired {
				inst.Status = InstanceStatusCompleted
			}
		}
	}
	return nil
}

func canonicalApprovalMessage(instanceID, stageID, gateID, actorID, delegatedFrom string, signedAt time.Time) string {
	return fmt.Sprintf("%s|%s|%s|%s|%s|%d", instanceID, stageID, gateID, actorID, delegatedFrom, signedAt.UTC().UnixNano())
}

func cloneInstance(src *WorkflowInstance) *WorkflowInstance {
	copy := *src
	copy.Context = make(map[string]string)
	for k, v := range src.Context {
		copy.Context[k] = v
	}
	copy.ActiveStages = make(map[string]*stageRuntime)
	for id, stage := range src.ActiveStages {
		stageCopy := *stage
		stageCopy.Gates = make(map[string]*gateRuntime)
		for gid, gate := range stage.Gates {
			gateCopy := *gate
			if gate.Bundle != nil {
				bundleCopy := *gate.Bundle
				gateCopy.Bundle = &bundleCopy
			}
			gateCopy.PrincipalApprovals = make(map[string]struct{})
			for k := range gate.PrincipalApprovals {
				gateCopy.PrincipalApprovals[k] = struct{}{}
			}
			gateCopy.Approvals = append([]bundle.ApprovalRecord(nil), gate.Approvals...)
			stageCopy.Gates[gid] = &gateCopy
		}
		copy.ActiveStages[id] = &stageCopy
	}
	copy.CompletedStages = make(map[string]StageResult)
	for k, v := range src.CompletedStages {
		copy.CompletedStages[k] = v
	}
	copy.ApprovalBundles = append([]bundle.ApprovalBundle(nil), src.ApprovalBundles...)
	return &copy
}
