package supermux

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sync/atomic"
)

type RunID string
type SessionID string
type EventID string

func NewRunID(seed []byte) RunID {
	hash := sha256.Sum256(seed)
	return RunID(fmt.Sprintf("SMX-RUN-%s", hex.EncodeToString(hash[:16])))
}

func NewSessionID(run RunID, name string) SessionID {
	data := fmt.Sprintf("%s:%s", run, name)
	hash := sha256.Sum256([]byte(data))
	return SessionID(fmt.Sprintf("SMX-SES-%s", hex.EncodeToString(hash[:16])))
}

var eventCounter uint64

func NextEventID() EventID {
	val := atomic.AddUint64(&eventCounter, 1)
	return EventID(fmt.Sprintf("SMX-EVT-%d", val))
}
