package ccmo

import "sync"

// ConsentRecord models an individual's permission for a topic/purpose pair.
type ConsentRecord struct {
	Allowed bool            `json:"allowed"`
	Locales map[string]bool `json:"locales"`
}

// ConsentStore maintains granular consent preferences.
type ConsentStore struct {
	mu       sync.RWMutex
	subjects map[string]map[string]map[string]ConsentRecord // subject -> topic -> purpose
}

// NewConsentStore constructs an empty ConsentStore.
func NewConsentStore() *ConsentStore {
	return &ConsentStore{subjects: make(map[string]map[string]map[string]ConsentRecord)}
}

// SetConsent records the consent preference for a subject/topic/purpose.
func (s *ConsentStore) SetConsent(subjectID, topic, purpose string, record ConsentRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.subjects[subjectID]; !ok {
		s.subjects[subjectID] = make(map[string]map[string]ConsentRecord)
	}
	if _, ok := s.subjects[subjectID][topic]; !ok {
		s.subjects[subjectID][topic] = make(map[string]ConsentRecord)
	}
	s.subjects[subjectID][topic][purpose] = record
}

// GetConsent retrieves the consent record for a subject/topic/purpose pair.
func (s *ConsentStore) GetConsent(subjectID, topic, purpose string) (ConsentRecord, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	topics, ok := s.subjects[subjectID]
	if !ok {
		return ConsentRecord{}, false
	}
	purposes, ok := topics[topic]
	if !ok {
		return ConsentRecord{}, false
	}
	record, ok := purposes[purpose]
	return record, ok
}
