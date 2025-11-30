package alsp

import (
	"context"
	"time"
)

// Prover is responsible for compressing the append-only audit log into block
// digests and constructing proofs for client queries.
type Prover struct {
	storage   Storage
	blockSize int

	pending []Event

	metrics *PerformanceMetrics
	clock   clock

	nextEventIndex uint64
	nextBlockIndex uint64
	lastDigest     []byte
}

// NewProver initialises a prover instance that continues from the persisted
// state when storage already contains blocks.
func NewProver(ctx context.Context, storage Storage, blockSize int) (*Prover, error) {
	if blockSize <= 0 {
		blockSize = 128
	}
	p := &Prover{
		storage:   storage,
		blockSize: blockSize,
		metrics:   &PerformanceMetrics{},
		clock:     systemClock{},
	}
	if storage != nil {
		block, err := storage.LatestBlock(ctx)
		if err == nil {
			p.lastDigest = append([]byte(nil), block.Digest...)
			p.nextBlockIndex = block.Index + 1
			p.nextEventIndex = block.EndIndex + 1
		} else if err != ErrBlockNotFound {
			return nil, err
		}
	}
	return p, nil
}

// AppendEvent ingests a new audit entry and compresses it when a block is full.
func (p *Prover) AppendEvent(ctx context.Context, timestamp time.Time, payload []byte) (Event, error) {
	event := Event{
		Index:     p.nextEventIndex,
		Timestamp: timestamp.UTC(),
		Payload:   append([]byte(nil), payload...),
	}
	p.pending = append(p.pending, event)
	p.metrics.recordRaw(len(event.Payload))
	p.nextEventIndex++

	if len(p.pending) >= p.blockSize {
		if err := p.flushPending(ctx); err != nil {
			return Event{}, err
		}
	}
	return event, nil
}

// Flush persists any pending events into a compressed block.
func (p *Prover) Flush(ctx context.Context) error {
	return p.flushPending(ctx)
}

func (p *Prover) flushPending(ctx context.Context) error {
	if len(p.pending) == 0 {
		return nil
	}
	block, err := newBlock(p.nextBlockIndex, p.lastDigest, p.pending, p.clock.Now())
	if err != nil {
		return err
	}
	if err := p.storage.SaveBlock(ctx, block); err != nil {
		return err
	}
	compressed := len(block.Digest) + len(block.MerkleRoot) + len(block.PrevDigest)
	p.metrics.recordCompressed(compressed)
	p.lastDigest = block.Digest
	p.nextBlockIndex++
	p.pending = nil
	return nil
}

// HeadDigest returns the digest of the most recently committed block.
func (p *Prover) HeadDigest() []byte {
	return append([]byte(nil), p.lastDigest...)
}

// Metrics exposes the prover's aggregated performance statistics.
func (p *Prover) Metrics() Report {
	return p.metrics.Report()
}
