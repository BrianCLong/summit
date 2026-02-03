import { UiPlan } from './schema.js';

export type PolicyFilter = {
  allowComponents?: string[];
  blockComponents?: string[];
  allowActions?: string[];
  blockActions?: string[];
};

export function applyPolicyFilter(plan: UiPlan, policy: PolicyFilter): UiPlan {
  const updatedPlan = structuredClone(plan);
  const allowComponents = policy.allowComponents ? new Set(policy.allowComponents) : null;
  const blockComponents = new Set(policy.blockComponents ?? []);
  const allowActions = policy.allowActions ? new Set(policy.allowActions) : null;
  const blockActions = new Set(policy.blockActions ?? []);

  updatedPlan.layout.pages.forEach((page) => {
    page.sections.forEach((section) => {
      section.panels = section.panels.filter((panel) => {
        if (blockComponents.has(panel.component)) {
          return false;
        }
        if (allowComponents && !allowComponents.has(panel.component)) {
          return false;
        }
        return true;
      });

      section.panels.forEach((panel) => {
        panel.actionIds = panel.actionIds.filter((actionId) => {
          if (blockActions.has(actionId)) {
            return false;
          }
          if (allowActions && !allowActions.has(actionId)) {
            return false;
          }
          return true;
        });
      });
    });
  });

  if (allowActions || blockActions.size > 0) {
    updatedPlan.actions = updatedPlan.actions.filter((action) => {
      if (blockActions.has(action.id)) {
        return false;
      }
      if (allowActions && !allowActions.has(action.id)) {
        return false;
      }
      return true;
    });
  }

  return updatedPlan;
}
