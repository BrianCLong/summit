package service

import "sync"

// BudgetEntry represents a guardrail state for an account and policy.
type BudgetEntry struct {
	Limit    float64
	Consumed float64
	Currency string
}

// BudgetLedger tracks consumption across policies.
type BudgetLedger struct {
	mu      sync.RWMutex
	entries map[BudgetKey]*BudgetEntry
}

// NewBudgetLedger constructs an empty ledger.
func NewBudgetLedger() *BudgetLedger {
	return &BudgetLedger{entries: make(map[BudgetKey]*BudgetEntry)}
}

// ensure returns an entry for the key, creating it if necessary.
func (l *BudgetLedger) ensure(key BudgetKey, limit float64, currency string) *BudgetEntry {
	l.mu.Lock()
	defer l.mu.Unlock()
	if entry, ok := l.entries[key]; ok {
		if entry.Currency == "" {
			entry.Currency = currency
		}
		if entry.Limit == 0 && limit > 0 {
			entry.Limit = limit
		}
		return entry
	}
	entry := &BudgetEntry{Limit: limit, Currency: currency}
	l.entries[key] = entry
	return entry
}

// Consume applies the charge against the ledger if within budget.
func (l *BudgetLedger) Consume(key BudgetKey, limit float64, currency string, amount float64) (*BudgetEntry, error) {
	entry := l.ensure(key, limit, currency)

	l.mu.Lock()
	defer l.mu.Unlock()

	entry = l.entries[key]
	if entry.Currency == "" {
		entry.Currency = currency
	}
	if entry.Limit == 0 {
		entry.Limit = limit
	}

	if entry.Consumed+amount > entry.Limit+1e-9 {
		return entry, errBudgetExceeded
	}

	entry.Consumed += amount
	return entry, nil
}

// Snapshot returns a copy of the current ledger entry.
func (l *BudgetLedger) Snapshot(key BudgetKey) (BudgetEntry, bool) {
	l.mu.RLock()
	defer l.mu.RUnlock()
	entry, ok := l.entries[key]
	if !ok {
		return BudgetEntry{}, false
	}
	return *entry, true
}
