package sdn

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"
	"strings"
)

// Fingerprint computes a canonical digest of the semantic view.
func Fingerprint(view GraphView) string {
	normalized := normalizeView(view)
	builder := strings.Builder{}

	motifKeys := make([]string, 0, len(normalized.Motifs))
	for key := range normalized.Motifs {
		motifKeys = append(motifKeys, key)
	}
	sort.Strings(motifKeys)
	for _, key := range motifKeys {
		motif := normalized.Motifs[key]
		builder.WriteString("M|")
		builder.WriteString(key)
		builder.WriteString("|")
		builder.WriteString(mapToPairs(motif.Attributes))
		builder.WriteByte('\n')
	}

	causalityKeys := make([]string, 0, len(normalized.Causality))
	for key := range normalized.Causality {
		causalityKeys = append(causalityKeys, key)
	}
	sort.Strings(causalityKeys)
	for _, key := range causalityKeys {
		relation := normalized.Causality[key]
		builder.WriteString("C|")
		builder.WriteString(key)
		builder.WriteString("|")
		builder.WriteString(string(relation.Direction))
		builder.WriteString("|")
		builder.WriteString(string(relation.Polarity))
		builder.WriteString("|")
		builder.WriteString(mapToPairs(relation.Metadata))
		builder.WriteByte('\n')
	}

	contradictionKeys := make([]string, 0, len(normalized.Contradictions))
	for key := range normalized.Contradictions {
		contradictionKeys = append(contradictionKeys, key)
	}
	sort.Strings(contradictionKeys)
	for _, key := range contradictionKeys {
		contradiction := normalized.Contradictions[key]
		builder.WriteString("X|")
		builder.WriteString(key)
		builder.WriteString("|")
		builder.WriteString(string(contradiction.Status))
		builder.WriteString("|")
		builder.WriteString(mapToPairs(contradiction.Metadata))
		builder.WriteByte('\n')
	}

	sum := sha256.Sum256([]byte(builder.String()))
	return hex.EncodeToString(sum[:])
}
