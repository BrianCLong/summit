package core

import "time"

// RequestStatus tracks the lifecycle of an access request.
type RequestStatus string

const (
	StatusPending  RequestStatus = "PENDING"
	StatusApproved RequestStatus = "APPROVED"
	StatusExpired  RequestStatus = "EXPIRED"
	StatusRevoked  RequestStatus = "REVOKED"
)

// Template describes a least-privilege access bundle that can be requested.
type Template struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Scopes      []string      `json:"scopes"`
	TTL         time.Duration `json:"ttl"`
}

// ApprovalRecord captures a single approver's decision.
type ApprovalRecord struct {
	ApproverID string    `json:"approverId"`
	ApprovedAt time.Time `json:"approvedAt"`
	Comment    string    `json:"comment,omitempty"`
}

// Grant represents the issued, time-boxed access material.
type Grant struct {
	IssuedAt  time.Time  `json:"issuedAt"`
	ExpiresAt time.Time  `json:"expiresAt"`
	RevokedAt *time.Time `json:"revokedAt,omitempty"`
	Active    bool       `json:"active"`
}

// AccessRequest is the aggregate entity driving the approval workflow.
type AccessRequest struct {
	ID          string           `json:"id"`
	TemplateID  string           `json:"templateId"`
	Template    Template         `json:"template"`
	RequestorID string           `json:"requestorId"`
	Purpose     string           `json:"purpose"`
	Status      RequestStatus    `json:"status"`
	CreatedAt   time.Time        `json:"createdAt"`
	UpdatedAt   time.Time        `json:"updatedAt"`
	Approvals   []ApprovalRecord `json:"approvals"`
	Grant       *Grant           `json:"grant,omitempty"`
}
