package receipts

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Item captures a deleted resource and its Merkle proof.
type Item struct {
	Kind       string   `json:"kind"`
	Identifier string   `json:"identifier"`
	Hash       string   `json:"hash"`
	Proof      []string `json:"proof"`
}

// Receipt records the outcome of a deletion sweep.
type Receipt struct {
	Policy    string    `json:"policy"`
	Root      string    `json:"root"`
	Timestamp time.Time `json:"timestamp"`
	Items     []Item    `json:"items"`
}

// Builder constructs receipts while computing Merkle proofs.
type Builder struct {
	policy string
	items  []Item
}

// NewBuilder initialises a receipt builder for a policy run.
func NewBuilder(policy string) *Builder {
	return &Builder{policy: policy}
}

// Add appends a deletion target to the receipt.
func (b *Builder) Add(kind, identifier string) {
	hash := leafHash(kind, identifier)
	b.items = append(b.items, Item{
		Kind:       kind,
		Identifier: identifier,
		Hash:       hex.EncodeToString(hash),
	})
}

// Build finalises the receipt computing proofs and the Merkle root.
func (b *Builder) Build() (Receipt, error) {
	if len(b.items) == 0 {
		return Receipt{
			Policy:    b.policy,
			Root:      hex.EncodeToString(leafHash("empty", "")),
			Timestamp: time.Now().UTC(),
			Items:     nil,
		}, nil
	}

	sort.Slice(b.items, func(i, j int) bool { return b.items[i].Identifier < b.items[j].Identifier })

	leaves := make([][]byte, len(b.items))
	for i := range b.items {
		decoded, err := hex.DecodeString(b.items[i].Hash)
		if err != nil {
			return Receipt{}, fmt.Errorf("decode hash: %w", err)
		}
		leaves[i] = decoded
	}

	levels := buildLevels(leaves)
	root := levels[len(levels)-1][0]

	for idx := range b.items {
		proof := buildProof(levels, idx)
		enc := make([]string, len(proof))
		for i, seg := range proof {
			prefix := "R"
			if seg.left {
				prefix = "L"
			}
			enc[i] = fmt.Sprintf("%s:%s", prefix, hex.EncodeToString(seg.hash))
		}
		b.items[idx].Proof = enc
	}

	return Receipt{
		Policy:    b.policy,
		Root:      hex.EncodeToString(root),
		Timestamp: time.Now().UTC(),
		Items:     b.items,
	}, nil
}

func leafHash(kind, identifier string) []byte {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s:%s", kind, identifier)))
	return h[:]
}

func buildLevels(leaves [][]byte) [][][]byte {
	levels := make([][][]byte, 0)
	current := make([][]byte, len(leaves))
	copy(current, leaves)
	levels = append(levels, current)

	for len(current) > 1 {
		next := make([][]byte, 0, (len(current)+1)/2)
		for i := 0; i < len(current); i += 2 {
			left := current[i]
			right := left
			if i+1 < len(current) {
				right = current[i+1]
			}
			combined := append([]byte{}, left...)
			combined = append(combined, right...)
			sum := sha256.Sum256(combined)
			next = append(next, sum[:])
		}
		current = next
		lvl := make([][]byte, len(current))
		copy(lvl, current)
		levels = append(levels, lvl)
	}

	return levels
}

type proofSegment struct {
	left bool
	hash []byte
}

func buildProof(levels [][][]byte, idx int) []proofSegment {
	proof := make([]proofSegment, 0, len(levels)-1)
	currentIndex := idx
	for level := 0; level < len(levels)-1; level++ {
		nodes := levels[level]
		siblingIndex := currentIndex ^ 1
		if siblingIndex >= len(nodes) {
			siblingIndex = currentIndex
		}
		left := siblingIndex < currentIndex
		proof = append(proof, proofSegment{left: left, hash: nodes[siblingIndex]})
		currentIndex /= 2
	}
	return proof
}

// FileWriter persists receipts on disk.
type FileWriter struct {
	dir string
}

func NewFileWriter(dir string) *FileWriter {
	return &FileWriter{dir: dir}
}

// Write stores a receipt as JSON in the configured directory.
func (f *FileWriter) Write(ctx context.Context, receipt Receipt) (string, error) {
	if err := os.MkdirAll(f.dir, 0o755); err != nil {
		return "", fmt.Errorf("mkdir receipts dir: %w", err)
	}
	filename := fmt.Sprintf("%s-%d.json", receipt.Policy, receipt.Timestamp.Unix())
	path := filepath.Join(f.dir, filename)
	payload, err := json.MarshalIndent(receipt, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal receipt: %w", err)
	}
	if err := os.WriteFile(path, payload, 0o644); err != nil {
		return "", fmt.Errorf("write receipt: %w", err)
	}
	return path, nil
}

// Verify recomputes the Merkle root for a receipt to ensure integrity.
func Verify(receipt Receipt) (bool, error) {
	if len(receipt.Items) == 0 {
		expected := hex.EncodeToString(leafHash("empty", ""))
		return receipt.Root == expected, nil
	}

	leaves := make([][]byte, len(receipt.Items))
	for i, item := range receipt.Items {
		decoded, err := hex.DecodeString(item.Hash)
		if err != nil {
			return false, fmt.Errorf("decode hash: %w", err)
		}
		computed := leafHash(item.Kind, item.Identifier)
		if hex.EncodeToString(computed) != item.Hash {
			return false, fmt.Errorf("leaf hash mismatch for %s", item.Identifier)
		}
		if !verifyProof(decoded, item.Proof, receipt.Root) {
			return false, fmt.Errorf("proof mismatch for %s", item.Identifier)
		}
		leaves[i] = decoded
	}

	levels := buildLevels(leaves)
	root := hex.EncodeToString(levels[len(levels)-1][0])
	return root == receipt.Root, nil
}

func verifyProof(leaf []byte, proof []string, expectedRoot string) bool {
	hash := leaf
	for _, siblingHex := range proof {
		parts := strings.SplitN(siblingHex, ":", 2)
		if len(parts) != 2 {
			return false
		}
		sibling, err := hex.DecodeString(parts[1])
		if err != nil {
			return false
		}
		combined := append([]byte{}, hash...)
		if parts[0] == "L" {
			combined = append(append([]byte{}, sibling...), hash...)
		} else {
			combined = append(hash, sibling...)
		}
		sum := sha256.Sum256(combined)
		hash = sum[:]
	}
	return hex.EncodeToString(hash) == expectedRoot
}
