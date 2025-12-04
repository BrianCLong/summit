package alsp

import "context"

// BlockProof bundles a subset of events and their membership proofs for a
// particular block.
type BlockProof struct {
	Header BlockHeader   `json:"header"`
	Events []Event       `json:"events"`
	Proofs []MerkleProof `json:"proofs"`
}

// RangeProof demonstrates that every event between Start and End is included in
// the log and anchored to the supplied head digest.
type RangeProof struct {
	Query       Range        `json:"query"`
	Blocks      []BlockProof `json:"blocks"`
	StartAnchor []byte       `json:"startAnchor"`
	HeadDigest  []byte       `json:"headDigest"`
}

// EventProof is a specialised proof that focuses on a single event.
type EventProof struct {
	Index      uint64     `json:"index"`
	Event      Event      `json:"event"`
	Block      BlockProof `json:"block"`
	HeadDigest []byte     `json:"headDigest"`
}

// GapProof asserts that there are no events inside the provided window by
// supplying consecutive block headers that fence off the gap.
type GapProof struct {
	Start      uint64      `json:"start"`
	End        uint64      `json:"end"`
	Left       BlockHeader `json:"left"`
	Right      BlockHeader `json:"right"`
	HeadDigest []byte      `json:"headDigest"`
}

// ProveRange builds an inclusion proof for the requested range.
func (p *Prover) ProveRange(ctx context.Context, r Range) (RangeProof, error) {
	startTime := p.clock.Now()
	if err := r.Validate(); err != nil {
		return RangeProof{}, err
	}
	blocks, err := p.allBlocks(ctx)
	if err != nil {
		return RangeProof{}, err
	}
	if len(blocks) == 0 {
		return RangeProof{}, ErrBlockNotFound
	}

	var proofs []BlockProof
	var seenStart, seenEnd bool
	for _, block := range blocks {
		if r.Start > block.EndIndex || r.End < block.StartIndex {
			continue
		}
		bp := buildBlockProof(block, r)
		if len(bp.Events) == 0 {
			continue
		}
		proofs = append(proofs, bp)
		if r.Start >= block.StartIndex && r.Start <= block.EndIndex {
			seenStart = true
		}
		if r.End >= block.StartIndex && r.End <= block.EndIndex {
			seenEnd = true
		}
	}
	if len(proofs) == 0 {
		return RangeProof{}, ErrInvalidProof
	}
	if !seenStart || !seenEnd {
		return RangeProof{}, ErrEventNotFound
	}
	report := RangeProof{
		Query:       r,
		Blocks:      proofs,
		HeadDigest:  append([]byte(nil), blocks[len(blocks)-1].Digest...),
		StartAnchor: append([]byte(nil), proofs[0].Header.PrevDigest...),
	}
	p.metrics.recordRangeLatency(p.clock.Now().Sub(startTime))
	return report, nil
}

// ProveEvent builds an inclusion proof for a single event index.
func (p *Prover) ProveEvent(ctx context.Context, index uint64) (EventProof, error) {
	startTime := p.clock.Now()
	blocks, err := p.allBlocks(ctx)
	if err != nil {
		return EventProof{}, err
	}
	leavesRange := Range{Start: index, End: index}
	for _, block := range blocks {
		if index < block.StartIndex || index > block.EndIndex {
			continue
		}
		bp := buildBlockProof(block, leavesRange)
		if len(bp.Events) == 0 {
			continue
		}
		proof := EventProof{
			Index:      index,
			Event:      bp.Events[0],
			Block:      bp,
			HeadDigest: append([]byte(nil), blocks[len(blocks)-1].Digest...),
		}
		p.metrics.recordEventLatency(p.clock.Now().Sub(startTime))
		return proof, nil
	}
	return EventProof{}, ErrEventNotFound
}

// ProveGap constructs a gap proof that the interval [start,end] has no events.
func (p *Prover) ProveGap(ctx context.Context, start, end uint64) (GapProof, error) {
	startTime := p.clock.Now()
	if end < start {
		return GapProof{}, ErrInvalidRange
	}
	blocks, err := p.allBlocks(ctx)
	if err != nil {
		return GapProof{}, err
	}
	var left Block
	var right Block
	foundLeft := false
	foundRight := false
	for _, block := range blocks {
		if block.EndIndex < start {
			left = block
			foundLeft = true
			continue
		}
		if block.StartIndex > end {
			right = block
			foundRight = true
			break
		}
	}
	if !foundLeft || !foundRight {
		return GapProof{}, ErrGapNotProvable
	}
	if right.Index != left.Index+1 {
		return GapProof{}, ErrGapNotProvable
	}
	if !ensureContinuity(left, right) {
		return GapProof{}, ErrInconsistentLog
	}
	proof := GapProof{
		Start:      start,
		End:        end,
		Left:       left.Header(),
		Right:      right.Header(),
		HeadDigest: append([]byte(nil), blocks[len(blocks)-1].Digest...),
	}
	p.metrics.recordGapLatency(p.clock.Now().Sub(startTime))
	return proof, nil
}

func buildBlockProof(block Block, r Range) BlockProof {
	leaves := make([][]byte, len(block.Events))
	for i, event := range block.Events {
		leaves[i] = event.Digest()
	}
	var events []Event
	var proofs []MerkleProof
	for i, event := range block.Events {
		if event.Index < r.Start || event.Index > r.End {
			continue
		}
		events = append(events, event)
		proofs = append(proofs, buildMerkleProof(leaves, i))
	}
	return BlockProof{
		Header: block.Header(),
		Events: events,
		Proofs: proofs,
	}
}

func (p *Prover) allBlocks(ctx context.Context) ([]Block, error) {
	latest, err := p.storage.LatestBlock(ctx)
	if err != nil {
		return nil, err
	}
	return p.storage.BlocksInRange(ctx, 0, latest.Index)
}
