package ccmo

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

// NotificationChannel enumerates supported outbound destinations.
type NotificationChannel string

const (
	ChannelEmail NotificationChannel = "email"
	ChannelPush  NotificationChannel = "push"
	ChannelInApp NotificationChannel = "in-app"
)

// NotificationRequest represents a delivery attempt.
type NotificationRequest struct {
	SubjectID string              `json:"subjectId"`
	Topic     string              `json:"topic"`
	Purpose   string              `json:"purpose"`
	Channel   NotificationChannel `json:"channel"`
	Locale    string              `json:"locale"`
	DarkMode  bool                `json:"darkMode"`
	Template  string              `json:"template"`
	Data      map[string]any      `json:"data"`
}

// NotificationResponse conveys the result of a send attempt.
type NotificationResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Body    string `json:"body,omitempty"`
}

// Service bundles CCMO domain logic.
type Service struct {
	consents      *ConsentStore
	templates     *TemplateRenderer
	frequency     *FrequencyTracker
	frequencyCaps map[NotificationChannel]FrequencyCap
	appeals       *AppealsLog
	clock         Clock
}

// NewService constructs a Service with defaults.
func NewService(clock Clock) (*Service, error) {
	if clock == nil {
		clock = RealClock{}
	}
	renderer, err := NewTemplateRenderer()
	if err != nil {
		return nil, err
	}
	return &Service{
		consents:      NewConsentStore(),
		templates:     renderer,
		frequency:     NewFrequencyTracker(),
		frequencyCaps: defaultFrequencyCaps(),
		appeals:       NewAppealsLog(),
		clock:         clock,
	}, nil
}

func defaultFrequencyCaps() map[NotificationChannel]FrequencyCap {
	return map[NotificationChannel]FrequencyCap{
		ChannelEmail: {MaxMessages: 3, Period: time.Hour},
		ChannelPush:  {MaxMessages: 5, Period: 30 * time.Minute},
		ChannelInApp: {MaxMessages: 8, Period: time.Hour},
	}
}

// SetFrequencyCap overrides the default cap for a channel.
func (s *Service) SetFrequencyCap(channel NotificationChannel, cap FrequencyCap) {
	s.frequencyCaps[channel] = cap
}

// SetConsent is a convenience wrapper for ConsentStore.SetConsent.
func (s *Service) SetConsent(subjectID, topic, purpose string, record ConsentRecord) {
	s.consents.SetConsent(subjectID, topic, purpose, record)
}

// Appeals returns the recorded appeals log.
func (s *Service) Appeals() []AppealEntry {
	return s.appeals.List()
}

// Send orchestrates consent, frequency, and templating checks before sending.
func (s *Service) Send(req NotificationRequest) (NotificationResponse, error) {
	if err := s.validateRequest(req); err != nil {
		return NotificationResponse{}, err
	}
	key := TemplateKey{
		Name:    req.Template,
		Channel: string(req.Channel),
		Locale:  normaliseLocale(req.Locale),
		Dark:    req.DarkMode,
	}

	consentRecord, ok := s.consents.GetConsent(req.SubjectID, req.Topic, req.Purpose)
	if !ok || !consentRecord.Allowed {
		s.recordAppeal(req, AppealReasonConsent)
		return NotificationResponse{Status: "blocked", Message: "consent not granted"}, nil
	}
	if len(consentRecord.Locales) > 0 {
		if !consentRecord.Locales[key.Locale] {
			s.recordAppeal(req, AppealReasonConsent)
			return NotificationResponse{Status: "blocked", Message: "locale not consented"}, nil
		}
	}

	cap, ok := s.frequencyCaps[req.Channel]
	if ok {
		freqKey := fmt.Sprintf("%s|%s|%s|%s", req.SubjectID, req.Topic, req.Purpose, req.Channel)
		if !s.frequency.Allow(freqKey, cap, s.clock.Now()) {
			s.recordAppeal(req, AppealReasonFrequency)
			return NotificationResponse{Status: "blocked", Message: "frequency cap exceeded"}, nil
		}
	}

	if req.Data == nil {
		req.Data = map[string]any{}
	}
	rendered, err := s.templates.Render(key, req.Data)
	if err != nil {
		return NotificationResponse{}, err
	}
	return NotificationResponse{Status: "sent", Message: "notification delivered", Body: rendered}, nil
}

func (s *Service) recordAppeal(req NotificationRequest, reason AppealReason) {
	s.appeals.Record(AppealEntry{
		SubjectID: req.SubjectID,
		Topic:     req.Topic,
		Purpose:   req.Purpose,
		Channel:   string(req.Channel),
		Reason:    reason,
		Timestamp: s.clock.Now().Unix(),
	})
}

func (s *Service) validateRequest(req NotificationRequest) error {
	if req.SubjectID == "" {
		return errors.New("subjectId is required")
	}
	if req.Topic == "" {
		return errors.New("topic is required")
	}
	if req.Purpose == "" {
		return errors.New("purpose is required")
	}
	if req.Template == "" {
		return errors.New("template is required")
	}
	switch req.Channel {
	case ChannelEmail, ChannelPush, ChannelInApp:
	default:
		return fmt.Errorf("unsupported channel %s", req.Channel)
	}
	if req.Locale == "" {
		return errors.New("locale is required")
	}
	return nil
}

func normaliseLocale(locale string) string {
	return strings.ReplaceAll(strings.ToLower(locale), "-", "_")
}
