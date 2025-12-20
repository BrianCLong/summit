package main

import (
	"fmt"
	"sync"
)

// JobRecord maintains projected and actual impact for a job.
type JobRecord struct {
	JobID     string        `json:"jobId"`
	Region    string        `json:"region"`
	Resources ResourceUsage `json:"resources"`
	Projected Estimate      `json:"projected"`
	Actual    *ActualReport `json:"actual,omitempty"`
}

// JobStore is an in-memory persistence layer for projections and reconciliations.
type JobStore struct {
	mu   sync.RWMutex
	jobs map[string]JobRecord
}

// NewJobStore constructs an empty store ready for use by the API handlers.
func NewJobStore() *JobStore {
	return &JobStore{jobs: make(map[string]JobRecord)}
}

// SaveProjection upserts the projected cost profile for a job.
func (s *JobStore) SaveProjection(jobID string, region string, usage ResourceUsage, estimate Estimate) JobRecord {
	s.mu.Lock()
	defer s.mu.Unlock()

	record := JobRecord{
		JobID:     jobID,
		Region:    region,
		Resources: usage,
		Projected: estimate,
	}
	if existing, ok := s.jobs[jobID]; ok {
		if existing.Actual != nil {
			record.Actual = existing.Actual
		}
	}

	s.jobs[jobID] = record
	return record
}

// ApplyActual stores realised usage for a job and reconciles it against the projection.
func (s *JobStore) ApplyActual(jobID string, region string, usage ResourceUsage, model *ResourceModel) (JobRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, ok := s.jobs[jobID]
	if !ok {
		return JobRecord{}, fmt.Errorf("projection for job %s not found", jobID)
	}

	actual, err := model.Actualise(region, usage, record.Projected)
	if err != nil {
		return JobRecord{}, err
	}

	record.Region = region
	record.Resources = usage
	record.Actual = &actual
	s.jobs[jobID] = record

	return record, nil
}

// Get retrieves the projection + reconciliation for a job if available.
func (s *JobStore) Get(jobID string) (JobRecord, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	record, ok := s.jobs[jobID]
	return record, ok
}
