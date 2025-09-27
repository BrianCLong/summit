package tokenvault

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"unicode"
)

type Context struct {
	Tenant  string
	Purpose string
	Field   string
}

type TokenVault struct {
	secret  []byte
	mu      sync.RWMutex
	reverse map[string]string
}

func NewTokenVault(secret string) *TokenVault {
	return &TokenVault{
		secret:  []byte(secret),
		reverse: make(map[string]string),
	}
}

func (v *TokenVault) key(ctx Context, token string) string {
	parts := []string{strings.ToLower(ctx.Tenant), strings.ToLower(ctx.Purpose), strings.ToLower(ctx.Field), token}
	return strings.Join(parts, "::")
}

func (v *TokenVault) Tokenize(ctx Context, value string) string {
	token := v.formatPreservingToken(ctx, value)
	v.mu.Lock()
	v.reverse[v.key(ctx, token)] = value
	v.mu.Unlock()
	return token
}

func (v *TokenVault) Reveal(ctx Context, token string) (string, bool) {
	v.mu.RLock()
	defer v.mu.RUnlock()
	val, ok := v.reverse[v.key(ctx, token)]
	return val, ok
}

func (v *TokenVault) Hash(ctx Context, value string) string {
	mac := hmac.New(sha256.New, v.secret)
	mac.Write([]byte("hash::"))
	mac.Write([]byte(strings.ToLower(ctx.Tenant)))
	mac.Write([]byte("::"))
	mac.Write([]byte(strings.ToLower(ctx.Purpose)))
	mac.Write([]byte("::"))
	mac.Write([]byte(strings.ToLower(ctx.Field)))
	mac.Write([]byte("::"))
	mac.Write([]byte(value))
	return hex.EncodeToString(mac.Sum(nil))
}

func (v *TokenVault) formatPreservingToken(ctx Context, value string) string {
	mac := hmac.New(sha256.New, v.secret)
	mac.Write([]byte(strings.ToLower(ctx.Tenant)))
	mac.Write([]byte("::"))
	mac.Write([]byte(strings.ToLower(ctx.Purpose)))
	mac.Write([]byte("::"))
	mac.Write([]byte(strings.ToLower(ctx.Field)))
	mac.Write([]byte("::"))
	mac.Write([]byte(value))
	digest := mac.Sum(nil)

	digits := digitAlphabet()
	upper := upperAlphabet()
	lower := lowerAlphabet()

	var builder strings.Builder
	builder.Grow(len(value))
	idx := 0
	for _, r := range value {
		switch {
		case unicode.IsDigit(r):
			builder.WriteByte(digits[int(digest[idx%len(digest)])%len(digits)])
		case unicode.IsUpper(r):
			builder.WriteByte(upper[int(digest[idx%len(digest)])%len(upper)])
		case unicode.IsLower(r):
			builder.WriteByte(lower[int(digest[idx%len(digest)])%len(lower)])
		default:
			builder.WriteRune(r)
			idx++
			continue
		}
		idx++
	}
	return builder.String()
}

func digitAlphabet() []byte {
	return []byte("0123456789")
}

func upperAlphabet() []byte {
	return []byte("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
}

func lowerAlphabet() []byte {
	return []byte("abcdefghijklmnopqrstuvwxyz")
}

// RecoveryGateConfig is used for YAML unmarshalling.
type RecoveryGateConfig struct {
	Threshold int                 `yaml:"threshold"`
	Shares    []RecoveryGateShare `yaml:"shares"`
}

type RecoveryGateShare struct {
	ID   string `yaml:"id"`
	Hash string `yaml:"hash"`
}

type storedShare struct {
	id     string
	digest [32]byte
}

type RecoveryGate struct {
	threshold int
	shares    []storedShare
}

func NewRecoveryGate(cfg RecoveryGateConfig) (*RecoveryGate, error) {
	if cfg.Threshold <= 0 {
		return nil, fmt.Errorf("threshold must be positive")
	}
	if len(cfg.Shares) < cfg.Threshold {
		return nil, fmt.Errorf("threshold %d exceeds share count %d", cfg.Threshold, len(cfg.Shares))
	}
	shares := make([]storedShare, 0, len(cfg.Shares))
	for _, share := range cfg.Shares {
		digest, err := hex.DecodeString(share.Hash)
		if err != nil {
			return nil, fmt.Errorf("decode share %s: %w", share.ID, err)
		}
		if len(digest) != sha256.Size {
			return nil, fmt.Errorf("share %s has invalid digest length", share.ID)
		}
		var arr [32]byte
		copy(arr[:], digest)
		shares = append(shares, storedShare{id: share.ID, digest: arr})
	}
	return &RecoveryGate{threshold: cfg.Threshold, shares: shares}, nil
}

func (r *RecoveryGate) Authorize(provided []string) bool {
	if len(provided) == 0 {
		return false
	}
	matched := 0
	used := make(map[string]struct{})
	for _, share := range provided {
		digest := sha256.Sum256([]byte(share))
		for _, stored := range r.shares {
			if _, exists := used[stored.id]; exists {
				continue
			}
			if hmac.Equal(digest[:], stored.digest[:]) {
				matched++
				used[stored.id] = struct{}{}
				break
			}
		}
		if matched >= r.threshold {
			return true
		}
	}
	return matched >= r.threshold
}
