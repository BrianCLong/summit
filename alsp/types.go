package alsp

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"time"
)

// Event represents a single audit log entry that will be committed into the
// compressed ledger. Events are addressed by their monotonically increasing
// index so proofs can be bound to deterministic positions within the log.
type Event struct {
	Index     uint64    `json:"index"`
	Timestamp time.Time `json:"timestamp"`
	Payload   []byte    `json:"payload"`
}

// Digest computes the stable hash for the event. The encoding is deterministic
// and includes every attribute that contributes to replay consistency.
func (e Event) Digest() []byte {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, e.Index)
	ts := e.Timestamp.UTC().UnixNano()
	tsBuf := make([]byte, 8)
	binary.BigEndian.PutUint64(tsBuf, uint64(ts))

	h := sha256.New()
	h.Write(buf)
	h.Write(tsBuf)
	h.Write(e.Payload)
	return h.Sum(nil)
}

// Block groups a contiguous run of events. Blocks reference the digest of the
// preceding block, forming a chain that enables succinct consistency proofs.
type Block struct {
	Index      uint64    `json:"index"`
	StartIndex uint64    `json:"startIndex"`
	EndIndex   uint64    `json:"endIndex"`
	CreatedAt  time.Time `json:"createdAt"`

	Events []Event `json:"events"`

	MerkleRoot []byte `json:"merkleRoot"`
	Digest     []byte `json:"digest"`
	PrevDigest []byte `json:"prevDigest"`
}

// Header renders the succinct representation of a block that is shared with
// verifiers.
func (b Block) Header() BlockHeader {
	return BlockHeader{
		Index:      b.Index,
		StartIndex: b.StartIndex,
		EndIndex:   b.EndIndex,
		MerkleRoot: append([]byte(nil), b.MerkleRoot...),
		Digest:     append([]byte(nil), b.Digest...),
		PrevDigest: append([]byte(nil), b.PrevDigest...),
	}
}

// HexDigest is a helper that turns a digest into a canonical string
// representation. Proofs and clients rely on the textual form for portability.
func HexDigest(b []byte) string {
	return hex.EncodeToString(b)
}

// BlockHeader represents the information that needs to be persisted or shared
// with clients so they can independently verify a proof. It intentionally omits
// the raw events, keeping the compressed representation succinct.
type BlockHeader struct {
	Index      uint64 `json:"index"`
	StartIndex uint64 `json:"startIndex"`
	EndIndex   uint64 `json:"endIndex"`

	MerkleRoot []byte `json:"merkleRoot"`
	Digest     []byte `json:"digest"`
	PrevDigest []byte `json:"prevDigest"`
}

// Range describes a requested inclusive interval of event indices.
type Range struct {
	Start uint64
	End   uint64
}

// Validate ensures the range parameters are meaningful. Proof generation uses
// this guard before attempting any storage lookups.
func (r Range) Validate() error {
	if r.End < r.Start {
		return ErrInvalidRange
	}
	return nil
}
