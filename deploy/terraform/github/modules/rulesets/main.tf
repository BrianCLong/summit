variable "organization" { type = string }
variable "repository" { type = string }
variable "release_captains_team" { type = string }
variable "required_status_checks" { type = list(string) }

# Require signed commits and tags
resource "github_repository_ruleset" "signed" {
  name        = "signed-artifacts"
  target      = "branch"
  enforcement = "active"
  repository  = var.repository

  conditions {
    ref_name {
      include = ["refs/heads/main", "refs/heads/release/*"]
      exclude = []
    }
  }

  rules {
    commit_author_email_pattern {
      operator = "includes"
      pattern  = "@"
    }
    commit_message_pattern {
      operator = "regex"
      pattern  = "^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\\(.+\\))?:"
    }
    tag {
      signed = true
    }
    required_signatures {}
  }
}

# Branch protections for main and release
resource "github_branch_protection_v3" "main" {
  repository_id = var.repository
  pattern       = "main"

  required_status_checks {
    strict   = true
    contexts = var.required_status_checks
  }

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
    required_approving_review_count = 2
    require_last_push_approval      = true
  }

  require_signed_commits = true
  allows_deletions       = false
  enforce_admins         = true
  allows_force_pushes    = false
}

resource "github_branch_protection_v3" "release" {
  repository_id = var.repository
  pattern       = "release/*"

  required_status_checks {
    strict   = true
    contexts = var.required_status_checks
  }

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
    required_approving_review_count = 2
    require_last_push_approval      = true
  }

  require_signed_commits = true
  allows_force_pushes    = false
  allows_deletions       = false
  enforce_admins         = true
  restrict_pushes {
    teams = [var.release_captains_team]
  }
}

# Limit merge methods
resource "github_repository" "settings" {
  name                   = var.repository
  allow_merge_commit     = true
  allow_rebase_merge     = false
  allow_squash_merge     = true
  delete_branch_on_merge = true
  squash_merge_commit_title = "PR_TITLE"
  squash_merge_commit_message = "PR_BODY"
}
