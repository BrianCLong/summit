package storage

type Artifact struct {
	Identifier string            `json:"identifier"`
	Region     string            `json:"region"`
	Metadata   map[string]string `json:"metadata"`
}

type Scanner interface {
	Scan(path string) ([]Artifact, error)
}
