package api

// JobManifest describes the data and evidence provided for enclave jobs.
type JobManifest struct {
	JobID             string   `json:"jobId"`
	Payload           []byte   `json:"payload"`
	AttestationQuotes [][]byte `json:"attestationQuotes"`
	ModelPack         string   `json:"modelPack"`
}

// RunJobRequest sent over gRPC/json codec.
type RunJobRequest struct {
	Manifest        JobManifest `json:"manifest"`
	SealedKey       []byte      `json:"sealedKey"`
	ExpectedHash    []byte      `json:"expectedHash"`
	ClientRegion    string      `json:"clientRegion"`
	AllowEgress     bool        `json:"allowEgress"`
	KMSWrapMaterial []byte      `json:"kmsWrapMaterial"`
}

// RunJobResponse returns sealed result and audit metadata.
type RunJobResponse struct {
	JobID        string `json:"jobId"`
	ResultHash   []byte `json:"resultHash"`
	SealedResult []byte `json:"sealedResult"`
	AuditToken   string `json:"auditToken"`
}
