package ccs

import (
	"bytes"
	"encoding/json"
)

// marshalCanonical encodes a structure with stable map ordering suitable for hashing.
func marshalCanonical(v interface{}) ([]byte, error) {
	buf := &bytes.Buffer{}
	encoder := json.NewEncoder(buf)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "")
	if err := encoder.Encode(v); err != nil {
		return nil, err
	}
	// json.Encoder.Encode appends a newline we do not want in canonical form.
	out := bytes.TrimRight(buf.Bytes(), "\n")
	return out, nil
}
