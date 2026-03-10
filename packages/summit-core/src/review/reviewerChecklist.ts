export interface ReviewerChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  notes?: string;
}

export interface ReviewerChecklistArtifact {
  checklist_id: string;
  branch_id: string;
  created_at: string;
  created_by: string;
  items: ReviewerChecklistItem[];
}

export function defaultReviewerChecklist(
  branchId: string,
  actorId: string,
  now: string,
): ReviewerChecklistArtifact {
  return {
    checklist_id: `chk-${branchId}-${now}`,
    branch_id: branchId,
    created_at: now,
    created_by: actorId,
    items: [
      {
        id: "prov-coverage",
        label: "Provenance coverage reviewed",
        required: true,
        completed: false,
      },
      {
        id: "contradictions",
        label: "Open contradictions reviewed",
        required: true,
        completed: false,
      },
      {
        id: "supersession",
        label: "Supersession chains reviewed",
        required: true,
        completed: false,
      },
      {
        id: "source-diversity",
        label: "Source diversity reviewed",
        required: true,
        completed: false,
      },
      {
        id: "promotion-scope",
        label: "Promotion scope confirmed",
        required: true,
        completed: false,
      },
    ],
  };
}

export function isChecklistComplete(artifact: ReviewerChecklistArtifact): boolean {
  return artifact.items.every((item) => !item.required || item.completed);
}
