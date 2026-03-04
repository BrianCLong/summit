const fs = require('fs');

class QueueBot {
  constructor(rulesPath) {
    const rawData = fs.readFileSync(rulesPath);
    this.rules = JSON.parse(rawData);
  }

  isP0Candidate(issue) {
    if (issue.labels.includes('P0-candidate')) return true;

    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return this.rules.keywords.ga_blocker.some(kw => text.includes(kw.toLowerCase()));
  }

  calculateScore(issue) {
    let score = 0;
    const text = `${issue.title} ${issue.body}`.toLowerCase();

    if (issue.labels.includes('prio:P0')) score += this.rules.scoring.label_prio_p0;
    if (this.rules.keywords.ga_blocker.some(kw => text.includes(kw.toLowerCase()))) score += this.rules.scoring.text_ga_blocker;
    if (issue.labels.includes('ga:blocker')) score += this.rules.scoring.label_ga_blocker;

    if (['ci', 'reproducibility', 'security'].some(lbl => issue.labels.includes(lbl))) score += this.rules.scoring.label_ci_repro_sec;

    // A very simple heuristic for "referencing failing workflow/check name"
    if (/(?:workflow|check|gate|failed|error)/i.test(text) && /\.yml|\.js/.test(text)) score += this.rules.scoring.text_failing_workflow;

    if (['needs-info', 'blocked'].some(lbl => issue.labels.includes(lbl))) score += this.rules.scoring.label_needs_info_blocked;

    return Math.max(0, Math.min(100, score)); // Assuming we clamp between 0 and 100 for a score
  }

  getConfidence(score) {
    if (score >= this.rules.confidence.high.min) return 'high';
    if (score >= this.rules.confidence.medium.min && score <= this.rules.confidence.medium.max) return 'medium';
    return 'low';
  }

  getCategory(issue) {
    const text = `${issue.title} ${issue.body}`.toLowerCase();

    for (const [category, keywords] of Object.entries(this.rules.categories)) {
      if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
        return category;
      }
    }
    return 'deps/other';
  }

  determineLabels(score, confidence) {
    const labels = new Set(['queue:deterministic']);

    if (score >= 70) {
      labels.add('prio:P0');
      labels.add('ga:blocker');
    } else if (score >= 50) {
      labels.add('prio:P1');
    }

    if (confidence !== 'high') {
      labels.add('needs-triage');
    }

    return Array.from(labels);
  }

  processIssue(issue, existingComments) {
    if (!this.isP0Candidate(issue)) {
      return null;
    }

    const score = this.calculateScore(issue);
    const confidence = this.getConfidence(score);
    const category = this.getCategory(issue);
    const appliedLabels = this.determineLabels(score, confidence);

    // Simplistic queue order logic based on issue ID (monotonic increase in standard GH flow)
    const queueOrder = issue.number;

    const payload = {
      queue_bot: "v1",
      category,
      score,
      confidence,
      queue_order: queueOrder,
      applied_labels: appliedLabels
    };

    // Check if we need to comment (idempotency check)
    const payloadStr = JSON.stringify(payload);
    const hasCommented = existingComments.some(comment =>
      comment.body.includes('"queue_bot": "v1"') && comment.body.includes(`"score": ${score}`)
    );

    if (hasCommented) {
      return { payload, action: 'none' }; // Already in correct state
    }

    return { payload, action: 'comment_and_label' };
  }
}

module.exports = QueueBot;
