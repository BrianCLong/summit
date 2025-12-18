package alsp

import "fmt"

// ReplayEntry bundles one of the supported proof types. Exactly one field must
// be populated per entry.
type ReplayEntry struct {
	RangeProof *RangeProof
	EventProof *EventProof
	GapProof   *GapProof
}

// ReplayOutcome captures the deterministic result of verifying a single entry.
type ReplayOutcome struct {
	Entry  ReplayEntry
	Result VerificationResult
	Err    error
}

// Replayer drives a verifier through a series of proofs to make deterministic
// replays straightforward for auditors.
type Replayer struct {
	verifier *Verifier
}

func NewReplayer(verifier *Verifier) *Replayer {
	return &Replayer{verifier: verifier}
}

// Replay processes the supplied entries sequentially. The first error halts the
// replay and is returned alongside the outcomes collected so far.
func (r *Replayer) Replay(entries []ReplayEntry) ([]ReplayOutcome, error) {
	outcomes := make([]ReplayOutcome, 0, len(entries))
	for _, entry := range entries {
		outcome := ReplayOutcome{Entry: entry}
		switch {
		case entry.RangeProof != nil:
			res, err := r.verifier.VerifyRange(*entry.RangeProof)
			outcome.Result = res
			outcome.Err = err
		case entry.EventProof != nil:
			res, err := r.verifier.VerifyEvent(*entry.EventProof)
			outcome.Result = res
			outcome.Err = err
		case entry.GapProof != nil:
			res, err := r.verifier.VerifyGap(*entry.GapProof)
			outcome.Result = res
			outcome.Err = err
		default:
			outcome.Err = fmt.Errorf("%w: empty replay entry", ErrInvalidProof)
		}
		outcomes = append(outcomes, outcome)
		if outcome.Err != nil {
			return outcomes, outcome.Err
		}
	}
	return outcomes, nil
}
