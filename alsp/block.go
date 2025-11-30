package alsp

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"time"
)

// newBlock constructs a block for the supplied events.
func newBlock(index uint64, prevDigest []byte, events []Event, createdAt time.Time) (Block, error) {
	if len(events) == 0 {
		return Block{}, nil
	}

	leaves := make([][]byte, len(events))
	for i, e := range events {
		leaves[i] = e.Digest()
	}
	merkleRoot, _ := buildMerkleTree(leaves)

	digest := deriveBlockDigest(index, events[0].Index, events[len(events)-1].Index, prevDigest, merkleRoot)

	return Block{
		Index:      index,
		StartIndex: events[0].Index,
		EndIndex:   events[len(events)-1].Index,
		CreatedAt:  createdAt.UTC(),
		Events:     append([]Event(nil), events...),
		MerkleRoot: merkleRoot,
		Digest:     digest,
		PrevDigest: append([]byte(nil), prevDigest...),
	}, nil
}

func deriveBlockDigest(blockIndex, startIndex, endIndex uint64, prevDigest, merkleRoot []byte) []byte {
	h := sha256.New()
	h.Write([]byte("alsp.block"))
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, blockIndex)
	h.Write(buf)
	binary.BigEndian.PutUint64(buf, startIndex)
	h.Write(buf)
	binary.BigEndian.PutUint64(buf, endIndex)
	h.Write(buf)
	h.Write(merkleRoot)
	h.Write(prevDigest)
	return h.Sum(nil)
}

// ensureContinuity asserts that the next block correctly references the
// previous digest and that indices form a contiguous run. This guard is part of
// the verifier as well as the replay logic.
func ensureContinuity(prev, next Block) bool {
	if !bytes.Equal(next.PrevDigest, prev.Digest) {
		return false
	}
	if next.StartIndex <= prev.EndIndex {
		return false
	}
	return true
}
