package core

import (
	"context"
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/summit/jitae/internal/audit"
	"github.com/summit/jitae/internal/clock"
	notify "github.com/summit/jitae/internal/notifier"
)

// Errors returned by the service layer.
var (
	ErrTemplateNotFound   = errors.New("template not found")
	ErrInvalidTemplateTTL = errors.New("template ttl must be positive")
	ErrRequestorRequired  = errors.New("requestor id is required")
	ErrPurposeRequired    = errors.New("purpose is required")
	ErrApproverRequired   = errors.New("approver id is required")
	ErrSelfApproval       = errors.New("requestor cannot self-approve")
	ErrRequestNotFound    = errors.New("request not found")
	ErrDuplicateApproval  = errors.New("approver has already approved")
	ErrRequestClosed      = errors.New("request is no longer pending")
)

// Service orchestrates access grants, approvals, and expirations.
type Service struct {
	clock    clock.Clock
	audit    *audit.Manager
	notifier notify.Notifier

	mu        sync.RWMutex
	templates map[string]Template
	requests  map[string]*AccessRequest
}

// NewService constructs a new Service instance.
func NewService(c clock.Clock, auditor *audit.Manager, nt notify.Notifier) *Service {
	if c == nil {
		c = clock.RealClock{}
	}
	if nt == nil {
		nt = notify.Noop{}
	}
	return &Service{
		clock:     c,
		audit:     auditor,
		notifier:  nt,
		templates: make(map[string]Template),
		requests:  make(map[string]*AccessRequest),
	}
}

// CreateTemplate registers a new access template.
func (s *Service) CreateTemplate(ctx context.Context, tpl Template) (Template, error) {
	if tpl.TTL <= 0 {
		return Template{}, ErrInvalidTemplateTTL
	}
	tpl.ID = uuid.NewString()

	s.mu.Lock()
	s.templates[tpl.ID] = tpl
	s.mu.Unlock()

	if s.audit != nil {
		_, err := s.audit.Record(ctx, "template.created", map[string]any{
			"templateId": tpl.ID,
			"ttlSeconds": int64(tpl.TTL.Seconds()),
		}, s.clock.Now())
		if err != nil {
			return Template{}, err
		}
	}

	return tpl, nil
}

// ListTemplates returns all registered templates sorted by name.
func (s *Service) ListTemplates() []Template {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Template, 0, len(s.templates))
	for _, tpl := range s.templates {
		out = append(out, cloneTemplate(tpl))
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Name < out[j].Name
	})
	return out
}

// CreateRequest submits a new access request.
func (s *Service) CreateRequest(ctx context.Context, templateID, requestorID, purpose string) (*AccessRequest, error) {
	if requestorID == "" {
		return nil, ErrRequestorRequired
	}
	if purpose == "" {
		return nil, ErrPurposeRequired
	}

	s.mu.RLock()
	tpl, ok := s.templates[templateID]
	s.mu.RUnlock()
	if !ok {
		return nil, ErrTemplateNotFound
	}

	now := s.clock.Now()
	req := &AccessRequest{
		ID:          uuid.NewString(),
		TemplateID:  tpl.ID,
		Template:    cloneTemplate(tpl),
		RequestorID: requestorID,
		Purpose:     purpose,
		Status:      StatusPending,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	s.mu.Lock()
	s.requests[req.ID] = req
	s.mu.Unlock()

	if s.audit != nil {
		if _, err := s.audit.Record(ctx, "access.requested", map[string]any{
			"requestId":   req.ID,
			"templateId":  tpl.ID,
			"requestorId": requestorID,
			"purpose":     purpose,
		}, now); err != nil {
			return nil, err
		}
	}

	_ = s.notifier.Notify(ctx, "request.created", map[string]any{
		"requestId":   req.ID,
		"templateId":  tpl.ID,
		"requestorId": requestorID,
	})

	return req.Clone(), nil
}

// ApproveRequest applies an independent approval and issues a grant.
func (s *Service) ApproveRequest(ctx context.Context, requestID, approverID, comment string) (*AccessRequest, error) {
	if approverID == "" {
		return nil, ErrApproverRequired
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	req, ok := s.requests[requestID]
	if !ok {
		return nil, ErrRequestNotFound
	}
	if req.Status != StatusPending {
		return nil, ErrRequestClosed
	}
	if req.RequestorID == approverID {
		return nil, ErrSelfApproval
	}

	for _, existing := range req.Approvals {
		if existing.ApproverID == approverID {
			return nil, ErrDuplicateApproval
		}
	}

	now := s.clock.Now()
	req.Approvals = append(req.Approvals, ApprovalRecord{
		ApproverID: approverID,
		ApprovedAt: now,
		Comment:    comment,
	})

	req.Grant = &Grant{
		IssuedAt:  now,
		ExpiresAt: now.Add(req.Template.TTL),
		Active:    true,
	}
	req.Status = StatusApproved
	req.UpdatedAt = now

	snapshot := req.Clone()

	if s.audit != nil {
		if _, err := s.audit.Record(ctx, "access.approved", map[string]any{
			"requestId":  req.ID,
			"approverId": approverID,
			"expiresAt":  req.Grant.ExpiresAt,
		}, now); err != nil {
			return nil, err
		}
	}

	go s.notifier.Notify(context.Background(), "request.approved", map[string]any{
		"requestId":  req.ID,
		"approverId": approverID,
		"expiresAt":  req.Grant.ExpiresAt,
	})

	return snapshot, nil
}

// ListRequests returns all requests ordered by creation time.
func (s *Service) ListRequests() []*AccessRequest {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*AccessRequest, 0, len(s.requests))
	for _, req := range s.requests {
		out = append(out, req.Clone())
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out
}

// ReconcileExpired revokes all grants whose expiry has passed.
func (s *Service) ReconcileExpired(ctx context.Context, now time.Time) ([]*AccessRequest, error) {
	s.mu.Lock()
	var expired []*AccessRequest
	for _, req := range s.requests {
		if req.Grant == nil || !req.Grant.Active {
			continue
		}
		if !req.Grant.ExpiresAt.After(now) {
			req.Grant.Active = false
			req.Status = StatusExpired
			req.UpdatedAt = now
			req.Grant.RevokedAt = ptrTime(now)
			expired = append(expired, req.Clone())
		}
	}
	s.mu.Unlock()

	for _, req := range expired {
		if s.audit != nil {
			if _, err := s.audit.Record(ctx, "access.expired", map[string]any{
				"requestId": req.ID,
				"expiredAt": now,
			}, now); err != nil {
				return nil, err
			}
		}
		_ = s.notifier.Notify(ctx, "request.expired", map[string]any{
			"requestId": req.ID,
			"expiredAt": now,
		})
	}

	return expired, nil
}

// RunExpiryLoop periodically revokes expired grants until the context is cancelled.
func (s *Service) RunExpiryLoop(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = time.Second * 5
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_, _ = s.ReconcileExpired(ctx, s.clock.Now())
		}
	}
}

// GetRequest retrieves a request by id.
func (s *Service) GetRequest(id string) (*AccessRequest, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	req, ok := s.requests[id]
	if !ok {
		return nil, ErrRequestNotFound
	}
	return req.Clone(), nil
}

// Clone creates a deep copy of the request for safe sharing.
func (r *AccessRequest) Clone() *AccessRequest {
	if r == nil {
		return nil
	}
	clone := *r
	clone.Template = cloneTemplate(r.Template)
	if r.Grant != nil {
		grantCopy := *r.Grant
		clone.Grant = &grantCopy
	}
	approvals := make([]ApprovalRecord, len(r.Approvals))
	copy(approvals, r.Approvals)
	clone.Approvals = approvals
	return &clone
}

func ptrTime(t time.Time) *time.Time {
	v := t
	return &v
}

func cloneTemplate(t Template) Template {
	clone := t
	scopes := make([]string, len(t.Scopes))
	copy(scopes, t.Scopes)
	clone.Scopes = scopes
	return clone
}
