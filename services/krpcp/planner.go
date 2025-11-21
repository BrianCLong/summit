package krpcp

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
)

type KeyKind string

const (
	KeyKindKMS       KeyKind = "kms"
	KeyKindHSM       KeyKind = "hsm"
	KeyKindEnvelope  KeyKind = "envelope"
	KeyKindSplit     KeyKind = "split"
	KeyKindSplitPart KeyKind = "split-part"
)

type Fixture struct {
	Keys   []KeyResource `json:"keys"`
	Assets []DataAsset   `json:"assets"`
}

type KeyResource struct {
	ID              string   `json:"id"`
	Kind            KeyKind  `json:"kind"`
	Parents         []string `json:"parents,omitempty"`
	Parts           []string `json:"parts,omitempty"`
	MaterialVersion int      `json:"materialVersion"`
	TargetVersion   int      `json:"targetVersion"`
}

type DataAsset struct {
	ID      string   `json:"id"`
	KeyRefs []string `json:"keyRefs"`
}

type StepKind string

const (
	StepKindCheckpoint StepKind = "checkpoint"
	StepKindRotate     StepKind = "rotate"
	StepKindVerify     StepKind = "verify"
)

type PlanStep struct {
	Index           int      `json:"index"`
	Kind            StepKind `json:"kind"`
	KeyID           string   `json:"keyId,omitempty"`
	Phase           string   `json:"phase,omitempty"`
	Description     string   `json:"description"`
	AffectedAssets  []string `json:"affectedAssets,omitempty"`
	DependencyHints []string `json:"dependencyHints,omitempty"`
}

type RotationPlan struct {
	Steps             []PlanStep          `json:"steps"`
	CoverageTargets   map[string][]string `json:"coverageTargets"`
	Fingerprint       string              `json:"fingerprint"`
	DependencyGraph   map[string][]string `json:"dependencyGraph"`
	AssetDependencies map[string][]string `json:"assetDependencies"`
}

type StepResult struct {
	StepIndex int      `json:"stepIndex"`
	Kind      StepKind `json:"kind"`
	KeyID     string   `json:"keyId,omitempty"`
	Phase     string   `json:"phase,omitempty"`
	Status    string   `json:"status"`
	Notes     []string `json:"notes,omitempty"`
}

type AssetCoverage struct {
	AssetID string   `json:"assetId"`
	Keys    []string `json:"keys"`
	Status  string   `json:"status"`
}

type CoverageProof struct {
	Assets []AssetCoverage `json:"assets"`
}

type ExecutionReceipt struct {
	PlanFingerprint string        `json:"planFingerprint"`
	StepResults     []StepResult  `json:"stepResults"`
	Coverage        CoverageProof `json:"coverage"`
}

type keyState struct {
	Resource       KeyResource
	CurrentVersion int
	Rotated        bool
}

type keyIndex struct {
	resources map[string]KeyResource
	deps      map[string][]string
}

func BuildRotationPlan(fixture Fixture) (RotationPlan, error) {
	idx, err := indexFixture(fixture)
	if err != nil {
		return RotationPlan{}, err
	}

	order, err := topoOrder(idx)
	if err != nil {
		return RotationPlan{}, err
	}

	coverageTargets, assetDeps, err := computeCoverageTargets(fixture, idx)
	if err != nil {
		return RotationPlan{}, err
	}

	steps := make([]PlanStep, 0, len(order)*4+1)
	stepIndex := 1
	for _, key := range order {
		assets := append([]string(nil), coverageTargets[key.ID]...)
		hintDeps := append([]string(nil), idx.deps[key.ID]...)
		sort.Strings(hintDeps)
		steps = append(steps, PlanStep{
			Index:           stepIndex,
			Kind:            StepKindCheckpoint,
			KeyID:           key.ID,
			Phase:           "pre",
			Description:     fmt.Sprintf("Capture rollback checkpoint before rotating %s", key.ID),
			DependencyHints: hintDeps,
		})
		stepIndex++

		steps = append(steps, PlanStep{
			Index:           stepIndex,
			Kind:            StepKindRotate,
			KeyID:           key.ID,
			Description:     fmt.Sprintf("Rotate %s (%s) to version %d", key.ID, key.Kind, key.TargetVersion),
			DependencyHints: hintDeps,
		})
		stepIndex++

		steps = append(steps, PlanStep{
			Index:          stepIndex,
			Kind:           StepKindVerify,
			KeyID:          key.ID,
			Description:    fmt.Sprintf("Validate decrypt coverage for assets protected by %s", key.ID),
			AffectedAssets: assets,
		})
		stepIndex++

		steps = append(steps, PlanStep{
			Index:          stepIndex,
			Kind:           StepKindCheckpoint,
			KeyID:          key.ID,
			Phase:          "post",
			Description:    fmt.Sprintf("Commit roll-forward checkpoint for %s", key.ID),
			AffectedAssets: assets,
		})
		stepIndex++
	}

	allAssets := make([]string, len(fixture.Assets))
	for i, asset := range fixture.Assets {
		allAssets[i] = asset.ID
	}
	sort.Strings(allAssets)
	steps = append(steps, PlanStep{
		Index:          stepIndex,
		Kind:           StepKindVerify,
		Description:    "Final decrypt coverage sweep across all assets",
		AffectedAssets: allAssets,
	})

	fingerprint, err := fingerprintSteps(steps)
	if err != nil {
		return RotationPlan{}, err
	}

	dependencyGraph := make(map[string][]string, len(idx.deps))
	for key, deps := range idx.deps {
		cp := append([]string(nil), deps...)
		sort.Strings(cp)
		dependencyGraph[key] = cp
	}

	plan := RotationPlan{
		Steps:             steps,
		CoverageTargets:   coverageTargets,
		Fingerprint:       fingerprint,
		DependencyGraph:   dependencyGraph,
		AssetDependencies: assetDeps,
	}

	return plan, nil
}

func ExecuteRotationPlan(plan RotationPlan, fixture Fixture) (ExecutionReceipt, error) {
	idx, err := indexFixture(fixture)
	if err != nil {
		return ExecutionReceipt{}, err
	}

	states := make(map[string]*keyState, len(idx.resources))
	for id, resource := range idx.resources {
		states[id] = &keyState{
			Resource:       resource,
			CurrentVersion: resource.MaterialVersion,
		}
	}

	coverageAccumulator := make(map[string]AssetCoverage)
	results := make([]StepResult, 0, len(plan.Steps))

	for _, step := range plan.Steps {
		result := StepResult{
			StepIndex: step.Index,
			Kind:      step.Kind,
			KeyID:     step.KeyID,
			Phase:     step.Phase,
		}

		switch step.Kind {
		case StepKindCheckpoint:
			result.Status = fmt.Sprintf("checkpoint-%s", step.Phase)
		case StepKindRotate:
			if err := applyRotation(step.KeyID, states, idx); err != nil {
				return ExecutionReceipt{}, err
			}
			result.Status = "rotated"
		case StepKindVerify:
			coverages, err := verifyAssets(step.AffectedAssets, fixture, states, idx)
			if err != nil {
				return ExecutionReceipt{}, err
			}
			for _, coverage := range coverages {
				coverageAccumulator[coverage.AssetID] = coverage
			}
			result.Status = "verified"
		default:
			return ExecutionReceipt{}, fmt.Errorf("unsupported step kind %q", step.Kind)
		}

		results = append(results, result)
	}

	assets := make([]AssetCoverage, 0, len(coverageAccumulator))
	for _, coverage := range coverageAccumulator {
		assets = append(assets, coverage)
	}
	sort.Slice(assets, func(i, j int) bool {
		return assets[i].AssetID < assets[j].AssetID
	})

	receipt := ExecutionReceipt{
		PlanFingerprint: plan.Fingerprint,
		StepResults:     results,
		Coverage: CoverageProof{
			Assets: assets,
		},
	}

	return receipt, nil
}

func ValidateCoverageProof(proof CoverageProof) error {
	if len(proof.Assets) == 0 {
		return errors.New("coverage proof has no assets")
	}
	for _, asset := range proof.Assets {
		if asset.AssetID == "" {
			return fmt.Errorf("coverage asset missing id")
		}
		if len(asset.Keys) == 0 {
			return fmt.Errorf("coverage for asset %s missing key evidence", asset.AssetID)
		}
		if asset.Status != "ok" {
			return fmt.Errorf("coverage for asset %s failed with status %s", asset.AssetID, asset.Status)
		}
	}
	return nil
}

func indexFixture(fixture Fixture) (*keyIndex, error) {
	resources := make(map[string]KeyResource, len(fixture.Keys))
	deps := make(map[string][]string, len(fixture.Keys))

	for _, key := range fixture.Keys {
		if key.ID == "" {
			return nil, errors.New("key missing id")
		}
		if key.Kind == "" {
			return nil, fmt.Errorf("key %s missing kind", key.ID)
		}
		if _, exists := resources[key.ID]; exists {
			return nil, fmt.Errorf("duplicate key id %s", key.ID)
		}
		if key.TargetVersion <= 0 {
			return nil, fmt.Errorf("key %s targetVersion must be > 0", key.ID)
		}
		normalized := key
		normalized.Kind = KeyKind(normalizeKind(string(key.Kind)))
		resources[key.ID] = normalized
		deps[key.ID] = append([]string(nil), append(normalized.Parents, normalized.Parts...)...)
	}

	for _, asset := range fixture.Assets {
		if asset.ID == "" {
			return nil, errors.New("asset missing id")
		}
		if len(asset.KeyRefs) == 0 {
			return nil, fmt.Errorf("asset %s has no keyRefs", asset.ID)
		}
		for _, keyID := range asset.KeyRefs {
			if _, ok := resources[keyID]; !ok {
				return nil, fmt.Errorf("asset %s references unknown key %s", asset.ID, keyID)
			}
		}
	}

	return &keyIndex{resources: resources, deps: deps}, nil
}

func normalizeKind(value string) string {
	switch value {
	case "KMS", "kms":
		return string(KeyKindKMS)
	case "HSM", "hsm":
		return string(KeyKindHSM)
	case "ENVELOPE", "envelope":
		return string(KeyKindEnvelope)
	case "SPLIT", "split":
		return string(KeyKindSplit)
	case "SPLIT-PART", "split-part", "split_part":
		return string(KeyKindSplitPart)
	default:
		return value
	}
}

func topoOrder(idx *keyIndex) ([]KeyResource, error) {
	indegree := make(map[string]int, len(idx.resources))
	followers := make(map[string][]string, len(idx.resources))

	for id := range idx.resources {
		indegree[id] = 0
	}

	for key, deps := range idx.deps {
		uniqueDeps := uniqueStrings(deps)
		idx.deps[key] = uniqueDeps
		for _, dep := range uniqueDeps {
			if _, ok := idx.resources[dep]; !ok {
				return nil, fmt.Errorf("key %s depends on unknown key %s", key, dep)
			}
			indegree[key]++
			followers[dep] = append(followers[dep], key)
		}
	}

	zero := make([]string, 0, len(idx.resources))
	for key, degree := range indegree {
		if degree == 0 {
			zero = append(zero, key)
		}
	}
	sort.Strings(zero)

	order := make([]KeyResource, 0, len(idx.resources))
	for len(zero) > 0 {
		current := zero[0]
		zero = zero[1:]
		order = append(order, idx.resources[current])
		children := followers[current]
		sort.Strings(children)
		for _, child := range children {
			indegree[child]--
			if indegree[child] == 0 {
				insertSorted(&zero, child)
			}
		}
	}

	if len(order) != len(idx.resources) {
		return nil, errors.New("dependency cycle detected in key graph")
	}

	return order, nil
}

func insertSorted(list *[]string, value string) {
	arr := *list
	idx := sort.SearchStrings(arr, value)
	if idx == len(arr) {
		*list = append(arr, value)
		return
	}
	if arr[idx] == value {
		return
	}
	arr = append(arr, "")
	copy(arr[idx+1:], arr[idx:])
	arr[idx] = value
	*list = arr
}

func uniqueStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		seen[value] = struct{}{}
	}
	unique := make([]string, 0, len(seen))
	for value := range seen {
		unique = append(unique, value)
	}
	sort.Strings(unique)
	return unique
}

func computeCoverageTargets(fixture Fixture, idx *keyIndex) (map[string][]string, map[string][]string, error) {
	keyToAssets := make(map[string]map[string]struct{}, len(idx.resources))
	assetDeps := make(map[string][]string, len(fixture.Assets))

	for _, asset := range fixture.Assets {
		deps, err := expandDependencies(asset.KeyRefs, idx)
		if err != nil {
			return nil, nil, err
		}
		direct := uniqueStrings(asset.KeyRefs)
		assetDeps[asset.ID] = append([]string(nil), deps...)
		for _, keyID := range direct {
			set, ok := keyToAssets[keyID]
			if !ok {
				set = make(map[string]struct{})
				keyToAssets[keyID] = set
			}
			set[asset.ID] = struct{}{}
		}
	}

	result := make(map[string][]string, len(keyToAssets))
	for key, assetSet := range keyToAssets {
		assets := make([]string, 0, len(assetSet))
		for asset := range assetSet {
			assets = append(assets, asset)
		}
		sort.Strings(assets)
		result[key] = assets
	}

	for asset, deps := range assetDeps {
		sort.Strings(deps)
		assetDeps[asset] = deps
	}

	return result, assetDeps, nil
}

func expandDependencies(keys []string, idx *keyIndex) ([]string, error) {
	seen := make(map[string]struct{})
	stack := make([]string, 0, len(keys))
	stack = append(stack, keys...)

	for len(stack) > 0 {
		keyID := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if _, ok := seen[keyID]; ok {
			continue
		}
		resource, ok := idx.resources[keyID]
		if !ok {
			return nil, fmt.Errorf("unknown key %s referenced in dependency expansion", keyID)
		}
		seen[keyID] = struct{}{}
		stack = append(stack, idx.deps[keyID]...)
		// Include parent relationships for split aggregators and envelopes.
		stack = append(stack, resource.Parents...)
		stack = append(stack, resource.Parts...)
	}

	expanded := make([]string, 0, len(seen))
	for key := range seen {
		expanded = append(expanded, key)
	}
	sort.Strings(expanded)
	return expanded, nil
}

func fingerprintSteps(steps []PlanStep) (string, error) {
	payload, err := json.Marshal(steps)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:]), nil
}

func applyRotation(keyID string, states map[string]*keyState, idx *keyIndex) error {
	state, ok := states[keyID]
	if !ok {
		return fmt.Errorf("unknown key %s in rotation", keyID)
	}

	dependencies := idx.deps[keyID]
	for _, dep := range dependencies {
		depState := states[dep]
		if depState.CurrentVersion != depState.Resource.TargetVersion {
			return fmt.Errorf("dependency %s not at target version when rotating %s", dep, keyID)
		}
	}

	if len(state.Resource.Parents) > 0 {
		for _, parent := range state.Resource.Parents {
			parentState := states[parent]
			if parentState.CurrentVersion != parentState.Resource.TargetVersion {
				return fmt.Errorf("parent %s not rotated when rotating %s", parent, keyID)
			}
		}
	}

	if len(state.Resource.Parts) > 0 {
		for _, part := range state.Resource.Parts {
			partState := states[part]
			if partState.CurrentVersion != partState.Resource.TargetVersion {
				return fmt.Errorf("split part %s not rotated when rotating %s", part, keyID)
			}
		}
	}

	state.CurrentVersion = state.Resource.TargetVersion
	state.Rotated = true
	return nil
}

func verifyAssets(assetIDs []string, fixture Fixture, states map[string]*keyState, idx *keyIndex) ([]AssetCoverage, error) {
	if len(assetIDs) == 0 {
		return nil, nil
	}
	sort.Strings(assetIDs)
	coverages := make([]AssetCoverage, 0, len(assetIDs))

	for _, assetID := range assetIDs {
		asset, ok := findAsset(assetID, fixture)
		if !ok {
			return nil, fmt.Errorf("plan references unknown asset %s", assetID)
		}
		deps, err := expandDependencies(asset.KeyRefs, idx)
		if err != nil {
			return nil, err
		}
		for _, dep := range deps {
			state, ok := states[dep]
			if !ok {
				return nil, fmt.Errorf("missing state for key %s", dep)
			}
			if state.CurrentVersion != state.Resource.TargetVersion {
				return nil, fmt.Errorf("asset %s stranded because key %s not rotated", assetID, dep)
			}
		}
		coverages = append(coverages, AssetCoverage{
			AssetID: assetID,
			Keys:    deps,
			Status:  "ok",
		})
	}

	return coverages, nil
}

func findAsset(id string, fixture Fixture) (DataAsset, bool) {
	for _, asset := range fixture.Assets {
		if asset.ID == id {
			return asset, true
		}
	}
	return DataAsset{}, false
}
