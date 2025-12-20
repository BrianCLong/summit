package engine

import (
	"fmt"
	"sort"

	"github.com/google/uuid"

	"github.com/summit/cab/internal/challenge"
	"github.com/summit/cab/internal/risk"
)

type Decision string

const (
	DecisionAllow  Decision = "allow"
	DecisionDeny   Decision = "deny"
	DecisionStepUp Decision = "step-up"
)

// Request captures the data provided by a relying party when requesting a decision.
type Request struct {
	Action             string                                 `json:"action"`
	Subject            map[string]string                      `json:"subject"`
	Resource           map[string]string                      `json:"resource"`
	Signals            risk.Signals                           `json:"signals"`
	ChallengeResponses map[string]challenge.VerificationInput `json:"challengeResponses"`
}

// Response captures the result of evaluating a request.
type Response struct {
	Decision           Decision         `json:"decision"`
	PolicyID           string           `json:"policyId,omitempty"`
	EvaluationID       string           `json:"evaluationId"`
	RiskLevel          risk.Level       `json:"riskLevel"`
	RiskBreakdown      []risk.Result    `json:"riskBreakdown"`
	Reasons            []string         `json:"reasons"`
	RequiredChallenges []challenge.Info `json:"requiredChallenges,omitempty"`
}

// Engine evaluates requests against ABAC policies and risk scorers.
type Engine struct {
	policies   []Policy
	scorers    []risk.Scorer
	challenges *challenge.Registry
}

func New(policies []Policy, scorers []risk.Scorer, registry *challenge.Registry) (*Engine, error) {
	if len(policies) == 0 {
		return nil, fmt.Errorf("at least one policy must be supplied")
	}
	return &Engine{policies: policies, scorers: scorers, challenges: registry}, nil
}

func (e *Engine) Evaluate(req Request) (Response, error) {
	evaluationID := uuid.NewString()
	res := Response{EvaluationID: evaluationID}

	matched := false
	var policy Policy
	for _, p := range e.policies {
		if p.matches(req) {
			policy = p
			matched = true
			break
		}
	}

	if !matched {
		res.Decision = DecisionDeny
		res.Reasons = append(res.Reasons, "no matching policy")
		return res, nil
	}

	res.PolicyID = policy.ID
	res.Reasons = append(res.Reasons, fmt.Sprintf("policy %s matched", policy.ID))

	riskInput := risk.Input{Signals: req.Signals, Subject: req.Subject, Resource: req.Resource, Action: req.Action}
	breakdown := make([]risk.Result, 0, len(e.scorers))
	for _, scorer := range e.scorers {
		breakdown = append(breakdown, scorer.Score(riskInput))
	}
	sort.SliceStable(breakdown, func(i, j int) bool {
		return breakdown[i].Name < breakdown[j].Name
	})
	res.RiskBreakdown = breakdown
	res.RiskLevel = risk.CombineLevels(breakdown)

	switch {
	case res.RiskLevel <= policy.AllowRisk:
		res.Decision = policy.Effect
		res.Reasons = append(res.Reasons, "risk within allow threshold")
		return res, nil
	case res.RiskLevel <= policy.StepUpRisk && len(policy.StepUpChallenges) > 0:
		challengesSatisfied := true
		missing := make([]challenge.Info, 0, len(policy.StepUpChallenges))
		for _, chType := range policy.StepUpChallenges {
			ch, err := e.challenges.Get(chType)
			if err != nil {
				return res, fmt.Errorf("challenge %s not available: %w", chType, err)
			}
			if err := ch.Verify(req.ChallengeResponses[chType]); err != nil {
				challengesSatisfied = false
				missing = append(missing, challenge.Info{Type: chType, Prompt: ch.Prompt()})
			}
		}
		if challengesSatisfied {
			res.Decision = policy.Effect
			res.Reasons = append(res.Reasons, "step-up completed")
			return res, nil
		}
		res.Decision = DecisionStepUp
		res.RequiredChallenges = missing
		res.Reasons = append(res.Reasons, "step-up required")
		return res, nil
	default:
		res.Decision = DecisionDeny
		res.Reasons = append(res.Reasons, "risk exceeds deny threshold")
		return res, nil
	}
}
