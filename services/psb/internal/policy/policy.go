package policy

import "github.com/summit/psb/internal/model"

// Filter returns records that satisfy the provided partner consent, geographic,
// and consent tag requirements while excluding already sampled or explicitly
// excluded record IDs.
func Filter(records []model.Record, partner string, geo, consentTags []string, exclusions, already map[string]struct{}) []model.Record {
	filtered := make([]model.Record, 0)
	for _, record := range records {
		if _, ok := exclusions[record.ID]; ok {
			continue
		}
		if _, ok := already[record.ID]; ok {
			continue
		}
		if !HasConsent(record, partner) {
			continue
		}
		if len(geo) > 0 && !Contains(geo, record.Geo) {
			continue
		}
		if len(consentTags) > 0 && !HasAll(record.ConsentTags, consentTags) {
			continue
		}
		filtered = append(filtered, record)
	}
	return filtered
}

// HasConsent reports whether the record lists the provided partner as
// consented.
func HasConsent(record model.Record, partner string) bool {
	return Contains(record.ConsentedPartners, partner)
}

// Contains returns whether the provided value is present in the slice.
func Contains(values []string, target string) bool {
	for _, candidate := range values {
		if candidate == target {
			return true
		}
	}
	return false
}

// HasAll reports whether all required values appear in the "have" slice.
func HasAll(have []string, required []string) bool {
	haveSet := make(map[string]struct{}, len(have))
	for _, val := range have {
		haveSet[val] = struct{}{}
	}
	for _, target := range required {
		if _, ok := haveSet[target]; !ok {
			return false
		}
	}
	return true
}
