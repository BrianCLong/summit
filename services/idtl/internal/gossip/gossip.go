package gossip

import (
	"encoding/base64"
	"fmt"

	merklelog "github.com/summit/transparency/idtl/internal/log"
)

type Observation struct {
	Source string
	Head   merklelog.SignedTreeHead
}

type ProofProvider interface {
	ConsistencyProof(oldSize, newSize int) ([][]byte, error)
}

func DetectEquivocation(observations []Observation) error {
	bySize := map[int]string{}
	for _, obs := range observations {
		if prev, ok := bySize[obs.Head.TreeSize]; ok {
			if prev != obs.Head.RootHash {
				return fmt.Errorf("equivocation detected between tree heads of size %d", obs.Head.TreeSize)
			}
		} else {
			bySize[obs.Head.TreeSize] = obs.Head.RootHash
		}
	}
	return nil
}

func VerifyConsistency(oldHead, newHead merklelog.SignedTreeHead, proof [][]byte) error {
	if oldHead.TreeSize > newHead.TreeSize {
		return fmt.Errorf("old head size %d exceeds new head size %d", oldHead.TreeSize, newHead.TreeSize)
	}
	verifier := merklelog.New()
	oldRoot, err := base64.StdEncoding.DecodeString(oldHead.RootHash)
	if err != nil {
		return fmt.Errorf("decode old root: %w", err)
	}
	newRoot, err := base64.StdEncoding.DecodeString(newHead.RootHash)
	if err != nil {
		return fmt.Errorf("decode new root: %w", err)
	}
	if !verifier.VerifyConsistency(oldHead.TreeSize, newHead.TreeSize, oldRoot, newRoot, proof) {
		return fmt.Errorf("consistency verification failed")
	}
	return nil
}
