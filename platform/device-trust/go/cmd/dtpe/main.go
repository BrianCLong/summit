package main

import (
  "crypto/sha256"
  "encoding/hex"
  "encoding/json"
  "log"
  "net/http"
  "sort"
  "strings"
  "sync"
  "time"
)

type webAuthnSignal struct {
  UserVerified   bool   `json:"userVerified"`
  UserPresent    bool   `json:"userPresent"`
  AttestationFmt string `json:"attestationFmt"`
}

type uaHints struct {
  Platform           string   `json:"platform"`
  Architecture       string   `json:"architecture"`
  SecChUaFullVersion []string `json:"secChUaFullVersion"`
  Mobile             bool     `json:"mobile"`
}

type localChecks struct {
  FirewallEnabled bool `json:"firewallEnabled"`
  DiskEncrypted   bool `json:"diskEncrypted"`
  ScreenLock      bool `json:"screenLock"`
  OfflineMode     bool `json:"offlineMode"`
}

type attestRequest struct {
  DeviceID      string         `json:"deviceId"`
  WebAuthn      webAuthnSignal `json:"webauthn"`
  UserAgent     uaHints        `json:"ua"`
  Local         localChecks    `json:"local"`
  SecureContext bool           `json:"secureContext"`
  ClipboardAPIs bool           `json:"clipboardApis"`
}

type policyAction struct {
  Rule       string `json:"rule"`
  Action     string `json:"action"`
  Rationale  string `json:"rationale"`
  StepUpType string `json:"stepUpType,omitempty"`
}

type attestationResult struct {
  RiskScore   int                    `json:"riskScore"`
  Status      string                 `json:"status"`
  Claims      map[string]any         `json:"claims"`
  Signals     []string               `json:"signals"`
  Policies    []policyAction         `json:"policies"`
  Rationale   []string               `json:"rationale"`
  CachedAt    time.Time              `json:"cachedAt"`
  OfflineHint string                 `json:"offlineHint,omitempty"`
  Privacy     map[string]interface{} `json:"privacy"`
}

type cachedAttestation struct {
  DeviceKey string
  Result    attestationResult
}

type attestor struct {
  cache map[string]cachedAttestation
  mu    sync.Mutex
}

func newAttestor() *attestor {
  return &attestor{cache: map[string]cachedAttestation{}}
}

func hashDeviceID(raw string) string {
  h := sha256.Sum256([]byte(strings.TrimSpace(raw)))
  return hex.EncodeToString(h[:])
}

func (a *attestor) score(req attestRequest) attestationResult {
  var score int
  var rationale []string
  var signals []string
  var policies []policyAction

  if !req.SecureContext {
    score += 35
    rationale = append(rationale, "Insecure transport: secure context is required")
    policies = append(policies, policyAction{Rule: "secure-context", Action: "block", Rationale: "Browser is not in a secure context (https)"})
  } else {
    signals = append(signals, "secure_context:ok")
  }

  if !req.WebAuthn.UserVerified {
    score += 20
    rationale = append(rationale, "WebAuthn user verification missing")
    policies = append(policies, policyAction{Rule: "webauthn", Action: "step_up", StepUpType: "webauthn-uv", Rationale: "Require user verification"})
  } else {
    signals = append(signals, "webauthn_uv:present")
  }

  if !req.WebAuthn.UserPresent {
    score += 10
    rationale = append(rationale, "WebAuthn user presence not asserted")
  }

  if !req.Local.FirewallEnabled {
    score += 15
    rationale = append(rationale, "Firewall disabled")
    policies = append(policies, policyAction{Rule: "firewall", Action: "downgrade", Rationale: "Firewall must be enabled"})
  } else {
    signals = append(signals, "firewall:on")
  }

  if !req.Local.DiskEncrypted {
    score += 10
    rationale = append(rationale, "Disk encryption missing")
  } else {
    signals = append(signals, "disk:encrypted")
  }

  if !req.Local.ScreenLock {
    score += 5
    rationale = append(rationale, "Screen lock disabled")
  }

  platform := strings.ToLower(req.UserAgent.Platform)
  if strings.Contains(platform, "windows 7") || strings.Contains(platform, "xp") {
    score += 40
    rationale = append(rationale, "Platform in block list")
    policies = append(policies, policyAction{Rule: "platform-block", Action: "block", Rationale: "Unsupported OS"})
  }

  if req.ClipboardAPIs && !req.SecureContext {
    score += 5
    rationale = append(rationale, "Clipboard API exposed in insecure context")
  }

  switch req.UserAgent.Architecture {
  case "arm64", "x86_64", "amd64":
    signals = append(signals, "arch:trusted")
  default:
    score += 5
    rationale = append(rationale, "Unrecognized architecture")
  }

  if req.Local.OfflineMode {
    signals = append(signals, "offline_mode:fc-pwa")
  }

  if score < 0 {
    score = 0
  }

  status := "pass"
  if score >= 70 {
    status = "block"
  } else if score >= 40 {
    status = "step_up"
  } else if score >= 25 {
    status = "downgrade"
  }

  claims := map[string]any{
    "posture:riskScore":      score,
    "posture:status":         status,
    "posture:assurance":      assuranceLevel(status, req),
    "posture:signals":        signals,
    "posture:session_action": status,
  }

  privacy := map[string]interface{}{
    "data_minimized":       true,
    "stored_identifier":    "sha256(deviceId)",
    "no_hardware_fingerpr": true,
  }

  if req.Local.OfflineMode {
    claims["posture:offline"] = true
  }

  return attestationResult{
    RiskScore:   score,
    Status:      status,
    Claims:      claims,
    Signals:     signals,
    Policies:    policies,
    Rationale:   rationale,
    CachedAt:    time.Now().UTC(),
    OfflineHint: offlineHint(req.Local.OfflineMode),
    Privacy:     privacy,
  }
}

func assuranceLevel(status string, req attestRequest) string {
  if status == "pass" && req.WebAuthn.UserVerified && req.Local.FirewallEnabled {
    return "high"
  }
  if status == "step_up" || status == "downgrade" {
    return "medium"
  }
  return "unknown"
}

func offlineHint(enabled bool) string {
  if !enabled {
    return ""
  }
  return "Offline mode cached; FC-PWA enforcement will use last-known-good posture"
}

func (a *attestor) handleAttest(w http.ResponseWriter, r *http.Request) {
  if r.Method != http.MethodPost {
    http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
    return
  }
  var req attestRequest
  decoder := json.NewDecoder(r.Body)
  decoder.DisallowUnknownFields()
  if err := decoder.Decode(&req); err != nil {
    http.Error(w, err.Error(), http.StatusBadRequest)
    return
  }
  if req.DeviceID == "" {
    http.Error(w, "deviceId required", http.StatusBadRequest)
    return
  }

  res := a.score(req)
  key := hashDeviceID(req.DeviceID)

  a.mu.Lock()
  a.cache[key] = cachedAttestation{DeviceKey: key, Result: res}
  a.mu.Unlock()

  writeJSON(w, http.StatusOK, map[string]any{
    "cacheKey": key,
    "result":   res,
  })
}

func (a *attestor) handleClaims(w http.ResponseWriter, r *http.Request) {
  deviceID := r.URL.Query().Get("deviceId")
  if deviceID == "" {
    http.Error(w, "deviceId required", http.StatusBadRequest)
    return
  }
  key := hashDeviceID(deviceID)
  a.mu.Lock()
  entry, ok := a.cache[key]
  a.mu.Unlock()
  if !ok {
    http.Error(w, "no attestation cached", http.StatusNotFound)
    return
  }
  writeJSON(w, http.StatusOK, map[string]any{
    "cacheKey": key,
    "claims":   entry.Result.Claims,
    "status":   entry.Result.Status,
    "cachedAt": entry.Result.CachedAt,
  })
}

func (a *attestor) handlePolicies(w http.ResponseWriter, _ *http.Request) {
  policies := map[string]any{
    "blockList":        []string{"windows 7", "xp"},
    "stepUp":           []string{"missing_webauthn_uv"},
    "sessionDowngrade": []string{"firewall_off", "weak_platform"},
    "privacyHints": []string{
      "No raw user identifiers stored",
      "WebAuthn attestations summarized, not persisted",
      "Clipboard APIs gated by secure context",
    },
    "offlineMode": map[string]any{
      "fcPwa": true,
      "fallback": "last_known_good",
    },
  }
  writeJSON(w, http.StatusOK, policies)
}

func (a *attestor) serve() {
  mux := http.NewServeMux()
  mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
    writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
  })
  mux.HandleFunc("/attest", a.handleAttest)
  mux.HandleFunc("/claims", a.handleClaims)
  mux.HandleFunc("/policies", a.handlePolicies)

  server := &http.Server{Addr: ":8088", Handler: logRequests(mux)}
  log.Println("dtpe attestor listening on :8088")
  if err := server.ListenAndServe(); err != nil {
    log.Fatal(err)
  }
}

func logRequests(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    next.ServeHTTP(w, r)
    log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
  })
}

func writeJSON(w http.ResponseWriter, status int, data any) {
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(status)
  enc := json.NewEncoder(w)
  enc.SetEscapeHTML(true)
  enc.Encode(data)
}

func main() {
  attestor := newAttestor()
  attestor.serve()
}

// sortedSignals returns a deterministic ordering useful for policy simulator output.
func sortedSignals(signals []string) []string {
  copyOf := append([]string(nil), signals...)
  sort.Strings(copyOf)
  return copyOf
}
