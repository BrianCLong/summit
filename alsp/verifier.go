package alsp

import (
	"bytes"
	"fmt"
)

// VerificationResult summarises a successful proof verification.
type VerificationResult struct {
	HeadDigest   []byte
	CoveredRange Range
	StartAnchor  []byte
}

// Verifier checks proofs emitted by the prover against an anchor digest.
type Verifier struct {
	anchor []byte
}

// NewVerifier initialises a verifier with the trusted log head digest. A nil
// anchor means the verifier will accept any digest and adopt it after the first
// successful verification.
func NewVerifier(anchor []byte) *Verifier {
	return &Verifier{anchor: append([]byte(nil), anchor...)}
}

// Anchor exposes the current trusted digest.
func (v *Verifier) Anchor() []byte {
	return append([]byte(nil), v.anchor...)
}

// AdvanceAnchor overrides the trusted digest. Callers typically use this after
// cross-checking a new digest with an external source of truth.
func (v *Verifier) AdvanceAnchor(digest []byte) {
	v.anchor = append([]byte(nil), digest...)
}

// VerifyRange validates a range proof and returns the covered interval on
// success.
func (v *Verifier) VerifyRange(proof RangeProof) (VerificationResult, error) {
	if err := proof.Query.Validate(); err != nil {
		return VerificationResult{}, err
	}
	if len(proof.Blocks) == 0 {
		return VerificationResult{}, ErrInvalidProof
	}
	if err := v.ensureAnchor(proof.HeadDigest); err != nil {
		return VerificationResult{}, err
	}
	if !bytes.Equal(proof.StartAnchor, proof.Blocks[0].Header.PrevDigest) {
		return VerificationResult{}, ErrInvalidProof
	}

	var prevHeader *BlockHeader
	var allIndices []uint64
	for _, block := range proof.Blocks {
		if err := validateBlockProof(block, prevHeader); err != nil {
			return VerificationResult{}, err
		}
		if len(block.Events) != len(block.Proofs) {
			return VerificationResult{}, ErrInvalidProof
		}
		for j, event := range block.Events {
			proofItem := block.Proofs[j]
			if !bytes.Equal(proofItem.LeafDigest, event.Digest()) {
				return VerificationResult{}, ErrInvalidProof
			}
			if !verifyMerkleProof(block.Header.MerkleRoot, proofItem) {
				return VerificationResult{}, ErrInvalidProof
			}
			allIndices = append(allIndices, event.Index)
		}
		prevHeader = &block.Header
	}
	if err := ensureCoverage(proof.Query, allIndices); err != nil {
		return VerificationResult{}, err
	}
	v.anchor = append([]byte(nil), proof.HeadDigest...)
	return VerificationResult{HeadDigest: proof.HeadDigest, CoveredRange: proof.Query, StartAnchor: append([]byte(nil), proof.StartAnchor...)}, nil
}

// VerifyEvent validates an event proof. The returned range collapses to the
// event index.
func (v *Verifier) VerifyEvent(proof EventProof) (VerificationResult, error) {
	if err := v.ensureAnchor(proof.HeadDigest); err != nil {
		return VerificationResult{}, err
	}
	if len(proof.Block.Events) != 1 || len(proof.Block.Proofs) != 1 {
		return VerificationResult{}, ErrInvalidProof
	}
	if proof.Event.Index != proof.Index {
		return VerificationResult{}, ErrInvalidProof
	}
	if err := validateBlockProof(proof.Block, nil); err != nil {
		return VerificationResult{}, err
	}
	event := proof.Block.Events[0]
	membership := proof.Block.Proofs[0]
	if !bytes.Equal(membership.LeafDigest, event.Digest()) {
		return VerificationResult{}, ErrInvalidProof
	}
	if !verifyMerkleProof(proof.Block.Header.MerkleRoot, membership) {
		return VerificationResult{}, ErrInvalidProof
	}
	if event.Index != proof.Index {
		return VerificationResult{}, ErrInvalidProof
	}
	v.anchor = append([]byte(nil), proof.HeadDigest...)
	return VerificationResult{HeadDigest: proof.HeadDigest, CoveredRange: Range{Start: proof.Index, End: proof.Index}, StartAnchor: append([]byte(nil), proof.Block.Header.PrevDigest...)}, nil
}

// VerifyGap validates that the provided block headers fence off an empty range.
func (v *Verifier) VerifyGap(proof GapProof) (VerificationResult, error) {
	if proof.End < proof.Start {
		return VerificationResult{}, ErrInvalidRange
	}
	if err := v.ensureAnchor(proof.HeadDigest); err != nil {
		return VerificationResult{}, err
	}
	// Ensure digests are self-consistent.
	if err := validateHeader(proof.Left); err != nil {
		return VerificationResult{}, err
	}
	if err := validateHeader(proof.Right); err != nil {
		return VerificationResult{}, err
	}
	if proof.Right.Index != proof.Left.Index+1 {
		return VerificationResult{}, ErrInvalidProof
	}
	if !bytes.Equal(proof.Right.PrevDigest, proof.Left.Digest) {
		return VerificationResult{}, ErrInconsistentLog
	}
	if proof.Start <= proof.Left.EndIndex {
		return VerificationResult{}, ErrInvalidProof
	}
	if proof.End >= proof.Right.StartIndex {
		return VerificationResult{}, ErrInvalidProof
	}
	v.anchor = append([]byte(nil), proof.HeadDigest...)
	return VerificationResult{HeadDigest: proof.HeadDigest, CoveredRange: Range{Start: proof.Start, End: proof.End}, StartAnchor: append([]byte(nil), proof.Left.PrevDigest...)}, nil
}

func (v *Verifier) ensureAnchor(digest []byte) error {
	if len(v.anchor) == 0 {
		v.anchor = append([]byte(nil), digest...)
		return nil
	}
	if !bytes.Equal(v.anchor, digest) {
		return fmt.Errorf("%w: unexpected head digest", ErrInvalidProof)
	}
	return nil
}

func validateBlockProof(block BlockProof, prev *BlockHeader) error {
	if err := validateHeader(block.Header); err != nil {
		return err
	}
	if prev != nil {
		if !bytes.Equal(block.Header.PrevDigest, prev.Digest) {
			return ErrInconsistentLog
		}
		if block.Header.StartIndex <= prev.EndIndex {
			return ErrInconsistentLog
		}
	}
	return nil
}

func validateHeader(header BlockHeader) error {
	digest := deriveBlockDigest(header.Index, header.StartIndex, header.EndIndex, header.PrevDigest, header.MerkleRoot)
	if !bytes.Equal(digest, header.Digest) {
		return ErrInvalidProof
	}
	return nil
}

func ensureCoverage(r Range, indices []uint64) error {
	if len(indices) == 0 {
		return ErrInvalidProof
	}
	for i := 1; i < len(indices); i++ {
		if indices[i] != indices[i-1]+1 {
			return ErrInvalidProof
		}
	}
	if indices[0] != r.Start {
		return ErrInvalidProof
	}
	if indices[len(indices)-1] != r.End {
		return ErrInvalidProof
	}
	return nil
}
