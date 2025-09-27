package alsp

import (
	"bytes"
	"crypto/sha256"
)

type merkleNode struct {
	hash []byte
}

// MerkleProof captures the sibling hashes necessary to verify the membership
// of a leaf hash within a specific Merkle root.
type MerkleProof struct {
	LeafDigest     []byte   `json:"leafDigest"`
	SiblingDigests [][]byte `json:"siblingDigests"`
	PathBits       []byte   `json:"pathBits"`
}

// buildMerkleTree constructs a binary Merkle tree and returns the root hash
// along with all intermediate layers used to extract proofs.
func buildMerkleTree(leaves [][]byte) ([]byte, [][]merkleNode) {
	if len(leaves) == 0 {
		empty := sha256.Sum256([]byte("alsp.empty"))
		return empty[:], [][]merkleNode{{{hash: empty[:]}}}
	}

	var layers [][]merkleNode
	current := make([]merkleNode, len(leaves))
	for i, leaf := range leaves {
		digest := sha256.Sum256(append([]byte("leaf"), leaf...))
		current[i] = merkleNode{hash: digest[:]}
	}
	layers = append(layers, current)

	for len(current) > 1 {
		var next []merkleNode
		for i := 0; i < len(current); i += 2 {
			if i+1 >= len(current) {
				// Duplicate the last node if the level is odd.
				next = append(next, merkleNode{hash: hashNode(current[i].hash, current[i].hash)})
				continue
			}
			next = append(next, merkleNode{hash: hashNode(current[i].hash, current[i+1].hash)})
		}
		current = next
		layers = append(layers, current)
	}

	return current[0].hash, layers
}

func hashNode(left, right []byte) []byte {
	h := sha256.New()
	h.Write([]byte("node"))
	h.Write(left)
	h.Write(right)
	return h.Sum(nil)
}

func buildMerkleProof(leaves [][]byte, index int) MerkleProof {
	_, layers := buildMerkleTree(leaves)
	proof := MerkleProof{
		LeafDigest: leaves[index],
	}
	var pathBits []byte
	var siblings [][]byte

	position := index
	for level := 0; level < len(layers)-1; level++ {
		layer := layers[level]
		var siblingPos int
		var bit byte
		if position%2 == 0 {
			// even index => sibling on the right
			if position+1 < len(layer) {
				siblingPos = position + 1
			} else {
				siblingPos = position
			}
			bit = 0
		} else {
			siblingPos = position - 1
			bit = 1
		}
		siblings = append(siblings, layer[siblingPos].hash)
		pathBits = append(pathBits, bit)
		position /= 2
	}
	proof.SiblingDigests = siblings
	proof.PathBits = pathBits
	return proof
}

// verifyMerkleProof checks that the supplied proof resolves to the provided
// root hash. The hashing strategy mirrors buildMerkleTree.
func verifyMerkleProof(root []byte, proof MerkleProof) bool {
	h := sha256.Sum256(append([]byte("leaf"), proof.LeafDigest...))
	current := h[:]
	for i, sibling := range proof.SiblingDigests {
		if proof.PathBits[i] == 0 {
			current = hashNode(current, sibling)
		} else {
			current = hashNode(sibling, current)
		}
	}
	return bytes.Equal(current, root)
}
