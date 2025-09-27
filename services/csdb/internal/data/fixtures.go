package data

import (
	"encoding/hex"
	"time"
)

type PersonalData struct {
	FullName string
	Email    string
	SSN      string
	Region   string
}

type DataRecord struct {
	ID            string
	Dataset       string
	PartnerID     string
	Jurisdictions []string
	Consents      map[string]bool
	CapturedAt    time.Time
	Payload       PersonalData
}

type Partner struct {
	ID                    string
	Name                  string
	AttestationPublicKey  []byte
	AttestationPrivateKey []byte
	ManifestPublicKey     []byte
	ManifestPrivateKey    []byte
}

var (
	// ExportFixtures contains a deterministic dataset used by tests and dry runs.
	ExportFixtures = []DataRecord{
		{
			ID:        "rec-001",
			Dataset:   "contacts",
			PartnerID: "partner-alpha",
			Jurisdictions: []string{
				"US",
				"CA",
			},
			Consents: map[string]bool{
				"marketing": true,
				"analytics": true,
			},
			CapturedAt: time.Date(2025, 1, 14, 13, 15, 0, 0, time.UTC),
			Payload: PersonalData{
				FullName: "Alice Johnson",
				Email:    "alice.johnson@example.com",
				SSN:      "123-45-6789",
				Region:   "US-MA",
			},
		},
		{
			ID:        "rec-002",
			Dataset:   "contacts",
			PartnerID: "partner-alpha",
			Jurisdictions: []string{
				"US",
				"MX",
			},
			Consents: map[string]bool{
				"marketing": false,
				"analytics": true,
			},
			CapturedAt: time.Date(2025, 1, 10, 9, 30, 0, 0, time.UTC),
			Payload: PersonalData{
				FullName: "Ben Castillo",
				Email:    "ben.castillo@example.com",
				SSN:      "987-65-4321",
				Region:   "US-TX",
			},
		},
		{
			ID:        "rec-003",
			Dataset:   "contacts",
			PartnerID: "partner-alpha",
			Jurisdictions: []string{
				"EU",
			},
			Consents: map[string]bool{
				"marketing": true,
				"analytics": true,
			},
			CapturedAt: time.Date(2025, 2, 2, 17, 45, 0, 0, time.UTC),
			Payload: PersonalData{
				FullName: "Chloe Martin",
				Email:    "chloe.martin@example.eu",
				SSN:      "456-78-9012",
				Region:   "FR-IDF",
			},
		},
	}

	// PartnerFixtures includes deterministic keys for attestation and manifest verification.
	PartnerFixtures = []Partner{
		{
			ID:                    "partner-alpha",
			Name:                  "Alpha Analytics Cooperative",
			AttestationPublicKey:  mustDecodeKey("f9aa48f69e0ad13412008033ea9099d258c23f26a6669d42471395c01359a4dd"),
			AttestationPrivateKey: mustDecodeKey("341d08611b9dd99ac04e1b17d1e7e7124ffd49467c539e619eb2fd54820427faf9aa48f69e0ad13412008033ea9099d258c23f26a6669d42471395c01359a4dd"),
			ManifestPublicKey:     mustDecodeKey("4221c3a1973b719b5be3f08b0795e84d4a6bf78f11566d10d9dc698c7b80a1cc"),
			ManifestPrivateKey:    mustDecodeKey("ddf5d1ca75051b0b2ca15940271d2bfbabeb1197eb041311507ed2c16a4603c04221c3a1973b719b5be3f08b0795e84d4a6bf78f11566d10d9dc698c7b80a1cc"),
		},
	}
)

func mustDecodeKey(hexKey string) []byte {
	b, err := hex.DecodeString(hexKey)
	if err != nil {
		panic(err)
	}
	return b
}

func init() {
	// Ensure fixture determinism by copying maps on load.
	for i := range ExportFixtures {
		consentCopy := make(map[string]bool, len(ExportFixtures[i].Consents))
		for k, v := range ExportFixtures[i].Consents {
			consentCopy[k] = v
		}
		ExportFixtures[i].Consents = consentCopy
	}
}
