package allocator

import (
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	errNoSubject              = errors.New("subject not registered with allocator")
	errConsentMissing         = errors.New("subject has not granted consent for purpose")
	errTenantMismatch         = errors.New("tenant mismatch between subject and experiment")
	errVariantWeightsInvalid  = errors.New("experiment must define positive weights for variants")
	errPowerToleranceExceeded = errors.New("rebalance tolerance exceeded")
)

// Allocator executes consent-aware assignments with deterministic stickiness.
type Allocator struct {
	mu          sync.Mutex
	ledger      Ledger
	subjects    map[string]Subject
	experiments map[string]ExperimentConfig
	assignments map[string]Assignment
}

// NewAllocator constructs an allocator that records every change into the supplied ledger.
func NewAllocator(ledger Ledger) *Allocator {
	return &Allocator{
		ledger:      ledger,
		subjects:    map[string]Subject{},
		experiments: map[string]ExperimentConfig{},
		assignments: map[string]Assignment{},
	}
}

func subjectKey(tenantID, subjectID string) string {
	return tenantID + ":" + subjectID
}

func assignmentKey(experimentID, tenantID, subjectID string) string {
	return experimentID + "|" + subjectKey(tenantID, subjectID)
}

// UpsertSubject registers or updates a subject and triggers rebalancing when consent changes.
func (a *Allocator) UpsertSubject(subject Subject) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if subject.Attributes == nil {
		subject.Attributes = map[string]string{}
	}
	if subject.Consents == nil {
		subject.Consents = map[string]ConsentGrant{}
	}

	key := subjectKey(subject.TenantID, subject.SubjectID)
	prev, hadPrev := a.subjects[key]
	a.subjects[key] = subject

	for _, exp := range a.experiments {
		if exp.TenantID != subject.TenantID {
			continue
		}
		prevConsent := hadPrev && prev.Consents != nil && prev.Consents[exp.Purpose].Granted
		newConsent := subject.Consents != nil && subject.Consents[exp.Purpose].Granted
		if prevConsent != newConsent {
			_ = a.rebalanceLocked(exp.ID)
		}
	}
}

// RemoveSubject removes any stored subject information and clears assignments.
func (a *Allocator) RemoveSubject(tenantID, subjectID string) {
	a.mu.Lock()
	defer a.mu.Unlock()

	key := subjectKey(tenantID, subjectID)
	delete(a.subjects, key)

	for assignKey, assignment := range a.assignments {
		if assignment.SubjectID != subjectID || assignment.TenantID != tenantID {
			continue
		}
		delete(a.assignments, assignKey)
		a.ledger.Record(LedgerEntry{
			Timestamp:    time.Now().UTC(),
			Event:        "revoked",
			ExperimentID: assignment.ExperimentID,
			SubjectID:    assignment.SubjectID,
			TenantID:     assignment.TenantID,
			Variant:      assignment.Variant,
			Stratum:      assignment.Stratum,
			Reason:       "subject removed",
		})
	}
}

// Assign returns a consent-aware assignment for the provided subject in the supplied experiment.
func (a *Allocator) Assign(experiment ExperimentConfig, tenantID, subjectID string) (Assignment, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.experiments[experiment.ID] = normalizeExperiment(experiment)

	sKey := subjectKey(tenantID, subjectID)
	subject, ok := a.subjects[sKey]
	if !ok {
		return Assignment{}, errNoSubject
	}
	if subject.TenantID != experiment.TenantID {
		return Assignment{}, errTenantMismatch
	}

	if err := a.rebalanceLocked(experiment.ID); err != nil {
		return Assignment{}, err
	}

	aKey := assignmentKey(experiment.ID, tenantID, subjectID)
	assignment, ok := a.assignments[aKey]
	if !ok {
		return Assignment{}, errConsentMissing
	}
	return assignment, nil
}

// LedgerEntries returns a copy of the underlying ledger events.
func (a *Allocator) LedgerEntries() []LedgerEntry {
	return a.ledger.Entries()
}

func normalizeExperiment(exp ExperimentConfig) ExperimentConfig {
	if exp.PowerTolerance <= 0 {
		exp.PowerTolerance = 0.05
	}
	return exp
}

func (a *Allocator) rebalanceLocked(experimentID string) error {
	exp := a.experiments[experimentID]

	stratumSubjects := map[string][]subjectState{}

	// Remove assignments for missing or non-consenting subjects.
	for key, assignment := range a.assignments {
		if assignment.ExperimentID != experimentID {
			continue
		}
		sKey := subjectKey(assignment.TenantID, assignment.SubjectID)
		subject, ok := a.subjects[sKey]
		if !ok || subject.TenantID != exp.TenantID || !hasConsent(subject, exp.Purpose) || matchesExclusion(exp.Exclusions, subject) {
			delete(a.assignments, key)
			reason := "consent or exclusion updated"
			if !ok {
				reason = "subject missing"
			}
			a.ledger.Record(LedgerEntry{
				Timestamp:    time.Now().UTC(),
				Event:        "revoked",
				ExperimentID: experimentID,
				SubjectID:    assignment.SubjectID,
				TenantID:     assignment.TenantID,
				Variant:      assignment.Variant,
				Stratum:      assignment.Stratum,
				Reason:       reason,
			})
			continue
		}
	}

	for _, subject := range a.subjects {
		if subject.TenantID != exp.TenantID {
			continue
		}
		if !hasConsent(subject, exp.Purpose) {
			continue
		}
		if matchesExclusion(exp.Exclusions, subject) {
			continue
		}
		stratum := resolveStratum(exp, subject)
		hash := stableHash(exp, stratum, subject)
		aKey := assignmentKey(experimentID, subject.TenantID, subject.SubjectID)
		assignment, exists := a.assignments[aKey]
		if exists && assignment.Stratum != stratum {
			delete(a.assignments, aKey)
			a.ledger.Record(LedgerEntry{
				Timestamp:    time.Now().UTC(),
				Event:        "rebalanced",
				ExperimentID: experimentID,
				SubjectID:    subject.SubjectID,
				TenantID:     subject.TenantID,
				Variant:      assignment.Variant,
				Stratum:      assignment.Stratum,
				Reason:       "stratum changed",
			})
			exists = false
		}
		stratumSubjects[stratum] = append(stratumSubjects[stratum], subjectState{
			Subject:         subject,
			Hash:            hash,
			Existing:        exists,
			ExistingVariant: assignment.Variant,
		})
	}

	for stratum, subjects := range stratumSubjects {
		if err := a.rebalanceStratum(experimentID, exp, stratum, subjects); err != nil {
			return err
		}
	}

	return nil
}

type subjectState struct {
	Subject         Subject
	Hash            uint64
	Existing        bool
	ExistingVariant string
}

func (a *Allocator) rebalanceStratum(experimentID string, exp ExperimentConfig, stratum string, subjects []subjectState) error {
	if len(subjects) == 0 {
		return nil
	}

	weights, err := weightMapForStratum(exp, stratum)
	if err != nil {
		return err
	}
	targetCounts := computeTargetCounts(len(subjects), exp.Variants, weights)

	currentCounts := map[string]int{}
	assignmentsByVariant := map[string][]subjectState{}
	var unassigned []subjectState

	for _, s := range subjects {
		if s.Existing {
			currentCounts[s.ExistingVariant]++
			assignmentsByVariant[s.ExistingVariant] = append(assignmentsByVariant[s.ExistingVariant], s)
			continue
		}
		unassigned = append(unassigned, s)
	}

	sort.Slice(unassigned, func(i, j int) bool {
		if unassigned[i].Hash == unassigned[j].Hash {
			return unassigned[i].Subject.SubjectID < unassigned[j].Subject.SubjectID
		}
		return unassigned[i].Hash < unassigned[j].Hash
	})

	for _, s := range unassigned {
		variant := nextVariantWithDeficit(exp.Variants, targetCounts, currentCounts)
		currentCounts[variant]++
		assignmentsByVariant[variant] = append(assignmentsByVariant[variant], subjectState{
			Subject: s.Subject,
			Hash:    s.Hash,
		})
		a.applyAssignment(experimentID, exp, variant, stratum, s.Subject, "assigned")
	}

	iterationGuard := len(subjects) * len(exp.Variants)
	for iterationGuard > 0 {
		iterationGuard--
		surplusVariant, deficitVariant := findSurplusAndDeficit(exp.Variants, targetCounts, currentCounts)
		if surplusVariant == "" || deficitVariant == "" {
			break
		}

		candidates := assignmentsByVariant[surplusVariant]
		if len(candidates) == 0 {
			break
		}
		sort.Slice(candidates, func(i, j int) bool {
			if candidates[i].Hash == candidates[j].Hash {
				return candidates[i].Subject.SubjectID > candidates[j].Subject.SubjectID
			}
			return candidates[i].Hash > candidates[j].Hash
		})

		moving := candidates[0]
		assignmentsByVariant[surplusVariant] = candidates[1:]
		currentCounts[surplusVariant]--
		currentCounts[deficitVariant]++
		assignmentsByVariant[deficitVariant] = append(assignmentsByVariant[deficitVariant], subjectState{
			Subject: moving.Subject,
			Hash:    moving.Hash,
		})
		a.applyAssignment(experimentID, exp, deficitVariant, stratum, moving.Subject, "rebalanced")
	}

	if !withinTolerance(exp, stratum, currentCounts) {
		return fmt.Errorf("%w for experiment %s stratum %s", errPowerToleranceExceeded, experimentID, stratum)
	}

	return nil
}

func (a *Allocator) applyAssignment(experimentID string, exp ExperimentConfig, variant, stratum string, subject Subject, event string) {
	key := assignmentKey(experimentID, subject.TenantID, subject.SubjectID)
	prev, hadPrev := a.assignments[key]

	assignment := Assignment{
		ExperimentID: experimentID,
		SubjectID:    subject.SubjectID,
		TenantID:     subject.TenantID,
		Variant:      variant,
		Stratum:      stratum,
		AssignedAt:   time.Now().UTC(),
		Reason:       event,
	}
	a.assignments[key] = assignment

	if hadPrev && prev.Variant == variant && prev.Stratum == stratum {
		return
	}

	reason := event
	if hadPrev && prev.Variant != variant {
		reason = "variant updated via " + event
	}
	if hadPrev && prev.Stratum != stratum {
		reason = "stratum updated via " + event
	}

	a.ledger.Record(LedgerEntry{
		Timestamp:    assignment.AssignedAt,
		Event:        event,
		ExperimentID: experimentID,
		SubjectID:    subject.SubjectID,
		TenantID:     subject.TenantID,
		Variant:      variant,
		Stratum:      stratum,
		Reason:       reason,
	})
}

func hasConsent(subject Subject, purpose string) bool {
	if subject.Consents == nil {
		return false
	}
	grant, ok := subject.Consents[purpose]
	return ok && grant.Granted
}

func matchesExclusion(rules []ExclusionRule, subject Subject) bool {
	for _, rule := range rules {
		value := subject.Attributes[rule.Attribute]
		for _, v := range rule.Values {
			if strings.EqualFold(v, value) {
				return true
			}
		}
	}
	return false
}

func resolveStratum(exp ExperimentConfig, subject Subject) string {
	for _, stratum := range exp.Strata {
		matches := true
		for key, value := range stratum.Criteria {
			if subject.Attributes[key] != value {
				matches = false
				break
			}
		}
		if matches {
			return stratum.Name
		}
	}
	return "default"
}

func weightMapForStratum(exp ExperimentConfig, stratum string) (map[string]float64, error) {
	weights := map[string]float64{}
	for _, variant := range exp.Variants {
		weights[variant.Name] = variant.Weight
	}

	for _, s := range exp.Strata {
		if s.Name == stratum {
			for name, weight := range s.Weights {
				weights[name] = weight
			}
			break
		}
	}

	sum := 0.0
	for _, variant := range exp.Variants {
		weight := weights[variant.Name]
		if weight <= 0 {
			return nil, errVariantWeightsInvalid
		}
		sum += weight
	}
	if sum <= 0 {
		return nil, errVariantWeightsInvalid
	}

	return weights, nil
}

func computeTargetCounts(totalSubjects int, variants []VariantConfig, weights map[string]float64) map[string]int {
	sumWeights := 0.0
	for _, variant := range variants {
		sumWeights += weights[variant.Name]
	}

	counts := map[string]int{}
	remainders := make([]struct {
		Name     string
		Fraction float64
	}, 0, len(variants))

	assigned := 0
	for _, variant := range variants {
		expected := float64(totalSubjects) * weights[variant.Name] / sumWeights
		base := int(expected)
		counts[variant.Name] = base
		remainders = append(remainders, struct {
			Name     string
			Fraction float64
		}{
			Name:     variant.Name,
			Fraction: expected - float64(base),
		})
		assigned += base
	}

	remainder := totalSubjects - assigned
	if remainder > 0 {
		sort.SliceStable(remainders, func(i, j int) bool {
			if remainders[i].Fraction == remainders[j].Fraction {
				return remainders[i].Name < remainders[j].Name
			}
			return remainders[i].Fraction > remainders[j].Fraction
		})
		for i := 0; i < remainder && i < len(remainders); i++ {
			counts[remainders[i].Name]++
		}
	}

	return counts
}

func nextVariantWithDeficit(variants []VariantConfig, target, current map[string]int) string {
	type candidate struct {
		name string
		diff int
	}
	candidates := make([]candidate, 0, len(variants))
	for _, variant := range variants {
		diff := target[variant.Name] - current[variant.Name]
		candidates = append(candidates, candidate{name: variant.Name, diff: diff})
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].diff == candidates[j].diff {
			return candidates[i].name < candidates[j].name
		}
		return candidates[i].diff > candidates[j].diff
	})
	return candidates[0].name
}

func findSurplusAndDeficit(variants []VariantConfig, target, current map[string]int) (string, string) {
	surplusName := ""
	surplusDiff := 0
	deficitName := ""
	deficitDiff := 0
	for _, variant := range variants {
		diff := current[variant.Name] - target[variant.Name]
		if diff > surplusDiff {
			surplusDiff = diff
			surplusName = variant.Name
		}
		if -diff > deficitDiff {
			deficitDiff = -diff
			deficitName = variant.Name
		}
	}
	if surplusDiff > 0 && deficitDiff > 0 {
		return surplusName, deficitName
	}
	return "", ""
}

func withinTolerance(exp ExperimentConfig, stratum string, current map[string]int) bool {
	total := 0
	for _, count := range current {
		total += count
	}
	if total == 0 {
		return true
	}

	weights, err := weightMapForStratum(exp, stratum)
	if err != nil {
		weights = map[string]float64{}
		for _, variant := range exp.Variants {
			weights[variant.Name] = 1
		}
	}
	sumWeights := 0.0
	for _, variant := range exp.Variants {
		sumWeights += weights[variant.Name]
	}
	if sumWeights == 0 {
		sumWeights = float64(len(exp.Variants))
	}

	allowed := exp.PowerTolerance
	sampleAllowance := 1.0 / float64(total)
	if sampleAllowance > allowed {
		allowed = sampleAllowance
	}
	for _, variant := range exp.Variants {
		expectedShare := weights[variant.Name] / sumWeights
		actualShare := float64(current[variant.Name]) / float64(total)
		if actualShare < 0 {
			actualShare = 0
		}
		if diff := absFloat(expectedShare - actualShare); diff > allowed+1e-9 {
			return false
		}
	}
	return true
}

func absFloat(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}

func stableHash(exp ExperimentConfig, stratum string, subject Subject) uint64 {
	stickKey := make([]string, 0, len(exp.StickinessKeys))
	for _, key := range exp.StickinessKeys {
		stickKey = append(stickKey, subject.Attributes[key])
	}
	payload := strings.Join([]string{
		exp.ID,
		exp.Purpose,
		stratum,
		subject.TenantID,
		subject.SubjectID,
		strings.Join(stickKey, "|"),
	}, "|")
	sum := sha256.Sum256([]byte(payload))
	return binary.BigEndian.Uint64(sum[:8])
}
