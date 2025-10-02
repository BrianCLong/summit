package ccs

import "fmt"

// Participant represents an individual eligible for sampling.
type Participant struct {
	ID         string            `json:"id"`
	Attributes map[string]string `json:"attributes"`
	Eligible   bool              `json:"eligible"`
}

// Normalize ensures default values are set.
func (p Participant) Normalize() (Participant, error) {
	if p.ID == "" {
		return Participant{}, fmt.Errorf("participant id must not be empty")
	}
	if p.Attributes == nil {
		p.Attributes = map[string]string{}
	}
	// Eligible defaults to true when omitted.
	if !p.Eligible {
		// keep explicit false
	}
	return p, nil
}

// StratificationPlan describes the attribute groupings and targets per stratum.
type StratificationPlan struct {
	Keys    []string       `json:"keys"`
	Targets map[string]int `json:"targets"`
}

// Validate ensures the plan is well-formed.
func (p StratificationPlan) Validate() error {
	if len(p.Keys) == 0 {
		return fmt.Errorf("stratification plan requires at least one key")
	}
	if len(p.Targets) == 0 {
		return fmt.Errorf("stratification plan requires targets")
	}
	for key, count := range p.Targets {
		if count < 0 {
			return fmt.Errorf("target for stratum %q must be non-negative", key)
		}
		if count == 0 {
			return fmt.Errorf("target for stratum %q must be greater than zero", key)
		}
		if key == "" {
			return fmt.Errorf("stratum key must not be empty")
		}
	}
	return nil
}

// Total returns the total sample size implied by the targets.
func (p StratificationPlan) Total() int {
	total := 0
	for _, count := range p.Targets {
		total += count
	}
	return total
}

// Stratify derives the stratum key for a participant.
func (p StratificationPlan) Stratify(participant Participant) (string, error) {
	if err := p.Validate(); err != nil {
		return "", err
	}
	values := make([]string, len(p.Keys))
	for idx, key := range p.Keys {
		v, ok := participant.Attributes[key]
		if !ok {
			return "", fmt.Errorf("participant %s missing attribute %s", participant.ID, key)
		}
		values[idx] = fmt.Sprintf("%s=%s", key, v)
	}
	return joinKey(values), nil
}

func joinKey(parts []string) string {
	if len(parts) == 0 {
		return ""
	}
	out := parts[0]
	for i := 1; i < len(parts); i++ {
		out += "|" + parts[i]
	}
	return out
}
