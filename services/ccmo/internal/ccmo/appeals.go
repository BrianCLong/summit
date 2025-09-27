package ccmo

import "sync"

// AppealReason defines why a notification was blocked.
type AppealReason string

const (
	// AppealReasonConsent indicates a missing consent.
	AppealReasonConsent AppealReason = "consent-block"
	// AppealReasonFrequency indicates frequency capping.
	AppealReasonFrequency AppealReason = "frequency-cap"
)

// AppealEntry captures a blocked delivery attempt.
type AppealEntry struct {
	SubjectID string       `json:"subjectId"`
	Topic     string       `json:"topic"`
	Purpose   string       `json:"purpose"`
	Channel   string       `json:"channel"`
	Reason    AppealReason `json:"reason"`
	Timestamp int64        `json:"timestamp"`
}

// AppealsLog stores blocked delivery attempts for audit/appeals.
type AppealsLog struct {
	mu      sync.RWMutex
	entries []AppealEntry
}

// NewAppealsLog constructs an AppealsLog.
func NewAppealsLog() *AppealsLog {
	return &AppealsLog{entries: make([]AppealEntry, 0)}
}

// Record adds an appeal entry.
func (l *AppealsLog) Record(entry AppealEntry) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.entries = append([]AppealEntry{entry}, l.entries...)
}

// List returns a copy of all appeal entries.
func (l *AppealsLog) List() []AppealEntry {
	l.mu.RLock()
	defer l.mu.RUnlock()
	out := make([]AppealEntry, len(l.entries))
	copy(out, l.entries)
	return out
}
