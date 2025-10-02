package evaluator

import (
	"fmt"
	"hash/fnv"
	"strings"
	"time"

	"github.com/summit/caff/policy"
)

type Evaluator struct{}

func New() *Evaluator {
	return &Evaluator{}
}

type Result struct {
	Decision    policy.Decision      `json:"decision"`
	ExplainPath []policy.ExplainStep `json:"explainPath"`
}

func (e *Evaluator) Evaluate(flag policy.Flag, ctx policy.SubjectContext) Result {
	explain := []policy.ExplainStep{
		{Rule: "flag", Result: flag.Key},
	}

	now := ctx.EvaluatedAt
	if now.IsZero() {
		now = time.Now().UTC()
		ctx.EvaluatedAt = now
	}

	if flag.ExpiresAt.Before(now) {
		explain = append(explain, policy.ExplainStep{Rule: "expiry", Result: "deny", Details: fmt.Sprintf("expired at %s", flag.ExpiresAt.UTC().Format(time.RFC3339))})
		return Result{Decision: policy.DecisionDeny, ExplainPath: explain}
	}
	explain = append(explain, policy.ExplainStep{Rule: "expiry", Result: "ok", Details: flag.ExpiresAt.UTC().Format(time.RFC3339)})

	if len(flag.Jurisdictions) > 0 && !contains(flag.Jurisdictions, ctx.Jurisdiction) {
		explain = append(explain, policy.ExplainStep{Rule: "jurisdiction", Result: "deny", Details: ctx.Jurisdiction})
		return Result{Decision: policy.DecisionDeny, ExplainPath: explain}
	}
	explain = append(explain, policy.ExplainStep{Rule: "jurisdiction", Result: "ok", Details: ctx.Jurisdiction})

	if len(flag.Audiences) > 0 && !overlap(flag.Audiences, ctx.Audiences) {
		explain = append(explain, policy.ExplainStep{Rule: "audience", Result: "deny", Details: strings.Join(ctx.Audiences, ",")})
		return Result{Decision: policy.DecisionDeny, ExplainPath: explain}
	}
	explain = append(explain, policy.ExplainStep{Rule: "audience", Result: "ok", Details: strings.Join(ctx.Audiences, ",")})

	missing := []string{}
	denied := []string{}
	consents := ctx.Consents
	if consents == nil {
		consents = map[string]string{}
	}
	for _, purpose := range flag.Purposes {
		consent := strings.ToLower(consents[purpose])
		switch consent {
		case "granted", "allow", "yes", "true":
			explain = append(explain, policy.ExplainStep{Rule: "purpose", Result: "granted", Details: purpose})
		case "denied", "no", "false":
			denied = append(denied, purpose)
		default:
			missing = append(missing, purpose)
		}
	}
	if len(denied) > 0 {
		explain = append(explain, policy.ExplainStep{Rule: "purpose", Result: "deny", Details: strings.Join(denied, ",")})
		return Result{Decision: policy.DecisionDeny, ExplainPath: explain}
	}
	if len(missing) > 0 {
		explain = append(explain, policy.ExplainStep{Rule: "purpose", Result: "step-up", Details: strings.Join(missing, ",")})
		return Result{Decision: policy.DecisionStepUp, ExplainPath: explain}
	}

	rollout := flag.Rollout
	if rollout.Percentage <= 0 {
		rollout = policy.DefaultRollout()
	}
	bucketID := ctx.BucketID
	if bucketID == "" {
		bucketID = ctx.SubjectID
	}
	bucket := hashBucket(flag.Key + "::" + bucketID)
	explain = append(explain, policy.ExplainStep{Rule: "bucket", Result: fmt.Sprintf("%d", bucket), Details: fmt.Sprintf("rollout=%d", rollout.Percentage)})
	if bucket >= rollout.Percentage {
		explain = append(explain, policy.ExplainStep{Rule: "rollout", Result: "deny"})
		return Result{Decision: policy.DecisionDeny, ExplainPath: explain}
	}
	explain = append(explain, policy.ExplainStep{Rule: "rollout", Result: "allow"})

	return Result{Decision: policy.DecisionAllow, ExplainPath: explain}
}

func contains(list []string, item string) bool {
	for _, v := range list {
		if strings.EqualFold(v, item) {
			return true
		}
	}
	return false
}

func overlap(a, b []string) bool {
	for _, v := range a {
		for _, w := range b {
			if strings.EqualFold(v, w) {
				return true
			}
		}
	}
	return false
}

func hashBucket(seed string) int {
	h := fnv.New32a()
	_, _ = h.Write([]byte(seed))
	return int(h.Sum32() % 100)
}
