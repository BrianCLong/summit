package model

import "time"

type Record struct {
	ID                string         `json:"id"`
	Geo               string         `json:"geo"`
	ConsentedPartners []string       `json:"consented_partners"`
	ConsentTags       []string       `json:"consent_tags"`
	Attributes        map[string]any `json:"attributes"`
	Metadata          map[string]any `json:"metadata"`
	LastUpdated       *time.Time     `json:"last_updated,omitempty"`
}

type Dataset struct {
	Records []Record `json:"records"`
}

type StratumRequest struct {
	Name        string   `json:"name"`
	Target      int      `json:"target"`
	Geo         []string `json:"geo,omitempty"`
	ConsentTags []string `json:"consent_tags,omitempty"`
}

type SamplingRequest struct {
	PartnerID  string           `json:"partner_id"`
	Seed       string           `json:"seed"`
	Strata     []StratumRequest `json:"strata"`
	Exclusions []string         `json:"exclusions,omitempty"`
}

type StratumCertificate struct {
	Name        string   `json:"name"`
	Target      int      `json:"target"`
	Geo         []string `json:"geo,omitempty"`
	ConsentTags []string `json:"consent_tags,omitempty"`
	SampledIDs  []string `json:"sampled_ids"`
	SeedOutput  string   `json:"seed_output"`
	SeedProof   string   `json:"seed_proof"`
}

type SamplingCertificate struct {
	PartnerID    string               `json:"partner_id"`
	Seed         string               `json:"seed"`
	VRFPublicKey string               `json:"vrf_public_key"`
	Strata       []StratumCertificate `json:"strata"`
	Exclusions   []string             `json:"exclusions"`
	GeneratedAt  time.Time            `json:"generated_at"`
}

type SamplingResponse struct {
	Samples     map[string][]Record `json:"samples"`
	Certificate SamplingCertificate `json:"certificate"`
}
