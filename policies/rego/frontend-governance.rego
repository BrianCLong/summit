package summit.frontend_governance

import future.keywords.if

default deny := []

frontend_change if count(frontend_files) > 0

frontend_files := [file |
  file := input.files[_]
  is_frontend_root(file)
]

is_frontend_root(file) if some i
  root := data.frontend_governance.frontend_roots[i]
  startswith(file, root)

valid_class if input.intake.change_class in {"0", "1", "2", "3", "4"}
valid_risk if input.intake.risk_level in {"low", "medium", "high"}
valid_surfaces if input.intake.affected_surfaces != ""

has_label(label) if label == input.pr.labels[_]

matches_any(patterns, file) if some i
  re_match(patterns[i], file)

ga_locked_files := [file |
  file := input.files[_]
  matches_any(data.frontend_governance.ga_locked_patterns, file)
]

elevated_review_files := [file |
  file := input.files[_]
  matches_any(data.frontend_governance.elevated_review_patterns, file)
]

frozen_files := [file |
  file := input.files[_]
  matches_any(data.frontend_governance.frozen_patterns, file)
]

deny[msg] if frontend_change and not valid_class
  msg := "Frontend change class missing or invalid (0-4 required)."

deny[msg] if frontend_change and not valid_risk
  msg := "Frontend risk level missing or invalid (low|medium|high required)."

deny[msg] if frontend_change and not valid_surfaces
  msg := "Affected surfaces must be declared for frontend changes."

deny[msg] if frontend_change and count(ga_locked_files) > 0 and not input.intake.ga_locked_ack == "yes"
  msg := sprintf("GA-locked files touched; acknowledge in PR intake. Files: %v", [ga_locked_files])

deny[msg] if frontend_change and count(ga_locked_files) > 0 and not has_label(data.frontend_governance.labels.frontend_governance)
  msg := sprintf("GA-locked files require label %s. Files: %v", [data.frontend_governance.labels.frontend_governance, ga_locked_files])

deny[msg] if frontend_change and count(elevated_review_files) > 0 and not has_label(data.frontend_governance.labels.frontend_governance)
  msg := sprintf("Elevated-review frontend files require label %s. Files: %v", [data.frontend_governance.labels.frontend_governance, elevated_review_files])

deny[msg] if frontend_change and count(frozen_files) > 0 and not has_label(data.frontend_governance.labels.emergency_exception)
  msg := sprintf("Frozen frontend surfaces require label %s. Files: %v", [data.frontend_governance.labels.emergency_exception, frozen_files])

deny[msg] if frontend_change and input.intake.change_class == "3" and not has_label(data.frontend_governance.labels.claims_review)
  msg := sprintf("Class 3 changes require label %s.", [data.frontend_governance.labels.claims_review])

deny[msg] if frontend_change and input.intake.change_class == "4" and not has_label(data.frontend_governance.labels.claims_review)
  msg := sprintf("Class 4 changes require label %s.", [data.frontend_governance.labels.claims_review])

deny[msg] if frontend_change and input.intake.change_class == "4" and not has_label(data.frontend_governance.labels.ethics_review)
  msg := sprintf("Class 4 changes require label %s.", [data.frontend_governance.labels.ethics_review])
