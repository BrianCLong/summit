package license

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"summit/security-supply-chain/internal/policy"
)

type Dependency struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	License string `json:"license"`
}

type Inventory struct {
	Dependencies []Dependency `json:"dependencies"`
}

type Exception struct {
	ID        string `json:"id"`
	Package   string `json:"package"`
	License   string `json:"license"`
	ExpiresAt string `json:"expiresAt"`
	Approvals []struct {
		Name string `json:"name"`
		Role string `json:"role"`
	} `json:"approvals"`
}

type Exceptions struct {
	Exceptions []Exception `json:"exceptions"`
}

type Evaluation struct {
	CheckedAt  time.Time `json:"checkedAt"`
	Violations []string  `json:"violations"`
}

func LoadInventory(path string) (Inventory, error) {
	var inv Inventory
	data, err := os.ReadFile(path)
	if err != nil {
		return inv, err
	}
	if err := json.Unmarshal(data, &inv); err != nil {
		return inv, err
	}
	return inv, nil
}

func LoadExceptions(path string) (Exceptions, error) {
	var ex Exceptions
	data, err := os.ReadFile(path)
	if err != nil {
		return ex, err
	}
	if err := json.Unmarshal(data, &ex); err != nil {
		return ex, err
	}
	return ex, nil
}

func Evaluate(pol policy.Policy, inv Inventory, ex Exceptions) Evaluation {
	blocked := map[string]struct{}{}
	for _, lic := range pol.Licenses.Blocked {
		blocked[lic] = struct{}{}
	}
	exceptions := map[string]Exception{}
	for _, e := range ex.Exceptions {
		exceptions[fmt.Sprintf("%s:%s", e.Package, e.License)] = e
	}

	result := Evaluation{CheckedAt: time.Now().UTC()}

	for _, dep := range inv.Dependencies {
		key := fmt.Sprintf("%s:%s", dep.Name, dep.License)
		if _, isBlocked := blocked[dep.License]; isBlocked {
			exception, allowed := exceptions[key]
			if !allowed {
				result.Violations = append(result.Violations, fmt.Sprintf("%s uses blocked license %s", dep.Name, dep.License))
				continue
			}
			if violation := validateException(pol, exception); violation != "" {
				result.Violations = append(result.Violations, violation)
			}
		}
	}

	return result
}

func validateException(pol policy.Policy, ex Exception) string {
	required := pol.Licenses.DualControl.RequiredApprovals
	if len(ex.Approvals) < required {
		return fmt.Sprintf("exception %s lacks %d approvals", ex.ID, required)
	}
	roleSet := map[string]struct{}{}
	for _, a := range ex.Approvals {
		roleSet[a.Role] = struct{}{}
	}
	for _, role := range pol.Licenses.DualControl.ApproverRoles {
		if _, ok := roleSet[role]; !ok {
			return fmt.Sprintf("exception %s missing approver with role %s", ex.ID, role)
		}
	}
	expiry, err := time.Parse("2006-01-02", ex.ExpiresAt)
	if err != nil {
		return fmt.Sprintf("exception %s has invalid expiry %s", ex.ID, ex.ExpiresAt)
	}
	if time.Now().After(expiry) {
		return fmt.Sprintf("exception %s expired on %s", ex.ID, ex.ExpiresAt)
	}
	return ""
}
