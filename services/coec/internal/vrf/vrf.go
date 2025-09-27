package vrf

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/base64"
	"encoding/binary"
)

// Evaluator deterministically produces pseudorandom outputs using an HMAC-SHA512 VRF surrogate.
type Evaluator struct {
	secret []byte
}

// NewEvaluator constructs a VRF evaluator with the provided shared secret.
func NewEvaluator(secret []byte) *Evaluator {
	secretCopy := make([]byte, len(secret))
	copy(secretCopy, secret)
	return &Evaluator{secret: secretCopy}
}

// Result encapsulates the VRF output and proof material.
type Result struct {
	Value []byte
	Proof string
}

// Evaluate produces a VRF result for a subject identifier. The output is stable for
// the same secret+input pair which enables reproducible cohort assignment.
func (e *Evaluator) Evaluate(input string) Result {
	mac := hmac.New(sha512.New, e.secret)
	mac.Write([]byte(input))
	sum := mac.Sum(nil)
	proof := base64.StdEncoding.EncodeToString(sum[len(sum)/2:])
	return Result{Value: sum[:len(sum)/2], Proof: proof}
}

// Fraction interprets the VRF result as a floating point value in [0, 1).
func (r Result) Fraction() float64 {
	if len(r.Value) < 8 {
		return 0
	}
	u := binary.BigEndian.Uint64(r.Value[:8])
	return float64(u) / float64(^uint64(0))
}

// Verify re-computes the VRF output to validate the provided proof. Because we are using
// an HMAC-based construction the proof is just the trailing bytes of the mac output.
func Verify(secret []byte, input string, proof string) bool {
	eval := NewEvaluator(secret)
	result := eval.Evaluate(input)
	return result.Proof == proof
}
