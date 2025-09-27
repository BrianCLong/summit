package allocator

import "sync"

// InMemoryLedger is a thread-safe ledger implementation suitable for tests and single-process workloads.
type InMemoryLedger struct {
	mu      sync.RWMutex
	entries []LedgerEntry
}

// NewInMemoryLedger constructs a ledger capable of storing assignment events.
func NewInMemoryLedger() *InMemoryLedger {
	return &InMemoryLedger{}
}

// Record appends an entry to the ledger.
func (l *InMemoryLedger) Record(entry LedgerEntry) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.entries = append(l.entries, entry)
}

// Entries returns a copy of all ledger entries.
func (l *InMemoryLedger) Entries() []LedgerEntry {
	l.mu.RLock()
	defer l.mu.RUnlock()
	out := make([]LedgerEntry, len(l.entries))
	copy(out, l.entries)
	return out
}
