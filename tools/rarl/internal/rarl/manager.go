package rarl

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

// DecisionRequest is the input evaluated by the limiter.
type DecisionRequest struct {
	TenantID     string
	ToolID       string
	Units        int
	Geo          string
	PolicyTier   string
	AnomalyScore float64
	PriorityLane string
	Timestamp    time.Time
}

// Decision contains the outcome of an evaluation.
type Decision struct {
	TenantID    string    `json:"tenantId"`
	ToolID      string    `json:"toolId"`
	Allowed     bool      `json:"allowed"`
	Reason      string    `json:"reason"`
	Remaining   int       `json:"remaining"`
	Limit       int       `json:"limit"`
	WindowStart time.Time `json:"windowStart"`
	WindowEnd   time.Time `json:"windowEnd"`
}

// SnapshotData represents a deterministic view of usage counters.
type SnapshotData struct {
	TenantID      string         `json:"tenantId"`
	GeneratedAt   time.Time      `json:"generatedAt"`
	WindowSeconds int            `json:"windowSeconds"`
	Tools         []ToolSnapshot `json:"tools"`
}

// ToolSnapshot captures counts for a single tool.
type ToolSnapshot struct {
	ToolID string         `json:"toolId"`
	Lanes  []LaneSnapshot `json:"lanes"`
	Config ToolConfig     `json:"config"`
}

// LaneSnapshot holds state for a particular priority lane.
type LaneSnapshot struct {
	Lane        string    `json:"lane"`
	WindowStart time.Time `json:"windowStart"`
	Used        int       `json:"used"`
}

type windowState struct {
	windowStart time.Time
	used        int
}

// Manager orchestrates the risk adaptive limiter.
type Manager struct {
	mu     sync.Mutex
	config Config
	window time.Duration
	state  map[string]*windowState
}

// NewManager creates a Manager using the provided configuration.
func NewManager(cfg Config) (*Manager, error) {
	if cfg.Secret == "" {
		return nil, errors.New("secret must be provided for snapshot signing")
	}
	if cfg.WindowSeconds < 0 {
		return nil, fmt.Errorf("windowSeconds cannot be negative")
	}
	if cfg.Tenants == nil {
		cfg.Tenants = map[string]TenantConfig{}
	}
	return &Manager{
		config: cfg,
		window: cfg.WindowDuration(),
		state:  map[string]*windowState{},
	}, nil
}

// Evaluate computes a quota decision.
func (m *Manager) Evaluate(req DecisionRequest) (Decision, error) {
	if req.TenantID == "" {
		return Decision{}, errors.New("tenantId is required")
	}
	if req.ToolID == "" {
		return Decision{}, errors.New("toolId is required")
	}
	if req.Units <= 0 {
		return Decision{}, errors.New("units must be positive")
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	tenantCfg, ok := m.config.Tenants[req.TenantID]
	if !ok {
		return Decision{}, fmt.Errorf("tenant %s not configured", req.TenantID)
	}
	toolCfg, ok := tenantCfg.Tools[req.ToolID]
	if !ok {
		return Decision{}, fmt.Errorf("tool %s not configured for tenant %s", req.ToolID, req.TenantID)
	}

	laneName := req.PriorityLane
	if laneName == "" {
		laneName = "default"
	}
	laneCfg := PriorityLaneConfig{Multiplier: 1.0}
	if toolCfg.PriorityLanes != nil {
		if cfg, exists := toolCfg.PriorityLanes[laneName]; exists {
			laneCfg = cfg
		} else if cfg, exists := toolCfg.PriorityLanes["default"]; exists {
			laneCfg = cfg
		}
	}

	if req.Timestamp.IsZero() {
		req.Timestamp = time.Now().UTC()
	} else {
		req.Timestamp = req.Timestamp.UTC()
	}
	windowStart := req.Timestamp.Truncate(m.window)
	key := decisionKey(req.TenantID, req.ToolID, laneName)
	st, exists := m.state[key]
	if !exists {
		st = &windowState{windowStart: windowStart}
		m.state[key] = st
	}
	if windowStart.After(st.windowStart) {
		st.windowStart = windowStart
		st.used = 0
	}

	limit, burst := deriveLimit(toolCfg, laneCfg, req)
	capacity := limit + burst
	if capacity < req.Units {
		return Decision{
			TenantID:    req.TenantID,
			ToolID:      req.ToolID,
			Allowed:     false,
			Reason:      "request exceeds configured capacity",
			Remaining:   max(0, capacity-st.used),
			Limit:       capacity,
			WindowStart: st.windowStart,
			WindowEnd:   st.windowStart.Add(m.window),
		}, nil
	}

	if st.used+req.Units > capacity {
		return Decision{
			TenantID:    req.TenantID,
			ToolID:      req.ToolID,
			Allowed:     false,
			Reason:      "quota exceeded",
			Remaining:   max(0, capacity-st.used),
			Limit:       capacity,
			WindowStart: st.windowStart,
			WindowEnd:   st.windowStart.Add(m.window),
		}, nil
	}

	st.used += req.Units

	return Decision{
		TenantID:    req.TenantID,
		ToolID:      req.ToolID,
		Allowed:     true,
		Reason:      "ok",
		Remaining:   capacity - st.used,
		Limit:       capacity,
		WindowStart: st.windowStart,
		WindowEnd:   st.windowStart.Add(m.window),
	}, nil
}

// Snapshot creates a signed snapshot for the provided tenant.
func (m *Manager) Snapshot(tenantID string) (SnapshotData, string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	tenantCfg, ok := m.config.Tenants[tenantID]
	if !ok {
		return SnapshotData{}, "", fmt.Errorf("tenant %s not configured", tenantID)
	}

	snapshot := SnapshotData{
		TenantID:      tenantID,
		GeneratedAt:   time.Now().UTC(),
		WindowSeconds: int(m.window / time.Second),
		Tools:         []ToolSnapshot{},
	}

	toolIDs := make([]string, 0, len(tenantCfg.Tools))
	for toolID := range tenantCfg.Tools {
		toolIDs = append(toolIDs, toolID)
	}
	sort.Strings(toolIDs)

	for _, toolID := range toolIDs {
		toolCfg := tenantCfg.Tools[toolID]
		laneEntries := collectLaneSnapshots(m.state, tenantID, toolID, toolCfg)
		snapshot.Tools = append(snapshot.Tools, ToolSnapshot{
			ToolID: toolID,
			Lanes:  laneEntries,
			Config: toolCfg,
		})
	}

	sig, err := signSnapshot(m.config.Secret, snapshot)
	if err != nil {
		return SnapshotData{}, "", err
	}
	return snapshot, sig, nil
}

// VerifySnapshot validates a signature for provided snapshot data.
func VerifySnapshot(secret string, data SnapshotData, signature string) (bool, error) {
	expected, err := signSnapshot(secret, data)
	if err != nil {
		return false, err
	}
	return hmac.Equal([]byte(expected), []byte(signature)), nil
}

func collectLaneSnapshots(state map[string]*windowState, tenantID, toolID string, toolCfg ToolConfig) []LaneSnapshot {
	lanes := map[string]LaneSnapshot{}
	// Ensure default lane present even if unused.
	lanes["default"] = LaneSnapshot{Lane: "default"}
	for lane := range toolCfg.PriorityLanes {
		if lane == "" {
			continue
		}
		lanes[lane] = LaneSnapshot{Lane: lane}
	}
	for laneName := range lanes {
		key := decisionKey(tenantID, toolID, laneName)
		if st, ok := state[key]; ok {
			lanes[laneName] = LaneSnapshot{
				Lane:        laneName,
				WindowStart: st.windowStart,
				Used:        st.used,
			}
		}
	}
	ordered := make([]LaneSnapshot, 0, len(lanes))
	for _, lane := range lanes {
		ordered = append(ordered, lane)
	}
	sort.Slice(ordered, func(i, j int) bool { return ordered[i].Lane < ordered[j].Lane })
	return ordered
}

func signSnapshot(secret string, snapshot SnapshotData) (string, error) {
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return "", err
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return base64.StdEncoding.EncodeToString(mac.Sum(nil)), nil
}

func deriveLimit(toolCfg ToolConfig, laneCfg PriorityLaneConfig, req DecisionRequest) (limit int, burst int) {
	base := toolCfg.BaseLimit
	if base <= 0 {
		base = 1
	}
	riskMultiplier := toolCfg.Risk.DefaultMultiplier
	if riskMultiplier == 0 {
		riskMultiplier = 1
	}
	riskMultiplier *= anomalyMultiplier(toolCfg.Risk.AnomalyBuckets, toolCfg.Risk.HighRiskPenaltyMultiplier, req.AnomalyScore)
	if geoMul, ok := toolCfg.Risk.GeoMultipliers[strings.ToLower(req.Geo)]; ok {
		riskMultiplier *= geoMul
	}
	if tierMul, ok := toolCfg.Risk.PolicyTierMultipliers[strings.ToLower(req.PolicyTier)]; ok {
		riskMultiplier *= tierMul
	}
	if laneCfg.Multiplier > 0 {
		riskMultiplier *= laneCfg.Multiplier
	}

	effectiveLimit := int(float64(base) * riskMultiplier)
	if effectiveLimit < 1 {
		effectiveLimit = 1
	}

	burst = toolCfg.BurstCredits + laneCfg.BurstBonus
	if burst < 0 {
		burst = 0
	}
	return effectiveLimit, burst
}

func anomalyMultiplier(buckets []AnomalyBucket, penalty float64, score float64) float64 {
	if len(buckets) == 0 {
		if penalty > 0 && score > 0 {
			return penalty
		}
		return 1
	}
	for _, bucket := range buckets {
		if score >= bucket.Min && (bucket.Max == 0 || score < bucket.Max) {
			if bucket.Multiplier <= 0 {
				return 1
			}
			return bucket.Multiplier
		}
	}
	if penalty > 0 {
		return penalty
	}
	return 1
}

func decisionKey(tenantID, toolID, lane string) string {
	return strings.Join([]string{tenantID, toolID, lane}, "|")
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
