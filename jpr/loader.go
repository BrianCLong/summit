package jpr

import (
	"io"

	"gopkg.in/yaml.v3"
)

// Parse decodes the YAML policy configuration into a PolicyDocument.
func Parse(r io.Reader) (PolicyDocument, error) {
	var doc PolicyDocument
	decoder := yaml.NewDecoder(r)
	decoder.KnownFields(true)
	if err := decoder.Decode(&doc); err != nil {
		return PolicyDocument{}, err
	}
	return doc, nil
}
