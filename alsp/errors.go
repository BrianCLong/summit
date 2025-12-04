package alsp

import "errors"

var (
	ErrInvalidRange    = errors.New("alsp: invalid range")
	ErrEventNotFound   = errors.New("alsp: event not found")
	ErrBlockNotFound   = errors.New("alsp: block not found")
	ErrInvalidProof    = errors.New("alsp: invalid proof")
	ErrGapNotProvable  = errors.New("alsp: gap cannot be proven with current snapshot")
	ErrInconsistentLog = errors.New("alsp: inconsistent block chain")
)
