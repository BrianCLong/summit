package mux

import (
	"encoding/json"
	pkg "supermux/pkg/supermux"
)

type StreamType string

const (
	StreamStdout StreamType = "stdout"
	StreamStderr StreamType = "stderr"
	StreamControl StreamType = "control"
	StreamEvent  StreamType = "event"
)

type Frame struct {
	EventID   pkg.EventID   `json:"event_id"`
	SessionID pkg.SessionID `json:"session_id"`
	Stream    StreamType    `json:"stream"`
	Data      []byte        `json:"data"`
	Timestamp int64         `json:"-"` // Non-deterministic, omit from JSON
}

func NewFrame(session pkg.SessionID, stream StreamType, data []byte) *Frame {
	return &Frame{
		EventID:   pkg.NextEventID(),
		SessionID: session,
		Stream:    stream,
		Data:      data,
	}
}

func (f *Frame) MarshalJSON() ([]byte, error) {
	type Alias Frame
	return json.Marshal(&struct {
		*Alias
	}{
		Alias: (*Alias)(f),
	})
}
