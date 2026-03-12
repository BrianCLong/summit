# Governance-Aware Automation Router

The Governance-Aware Automation Router is the component responsible for evaluating whether a given action (like a playbook step) is permitted to execute automatically. It enforces the policies defined in the `SAFE_AUTOMATION Policy Registry` by comparing them against real-time risk assessments and governance approvals.

## How Decisions Are Made

The `AutomationRouter` takes three inputs:

1.  **PlaybookStep**: The proposed action to perform, containing an `AutomationActionClass`.
2.  **RiskContext**: The current risk level (e.g., `LOW`, `HIGH`) and relevant risk factors.
3.  **GovernanceContext**: The highest level of approval obtained from the Governance Council OS (e.g., `TIER_1_COUNCIL`) and the associated approval IDs.

It outputs a `RouterResult` containing a `RoutingDecision` and a human-readable reason.

### Routing Decisions

-   `MANUAL_ONLY`: The action is not eligible for automation. This occurs if there is no policy defined for the action, or if the current risk level is below the minimum risk level required by the policy.
-   `NEEDS_APPROVAL`: The action meets the risk requirements for automation, but lacks the necessary governance approval. For example, if an action requires `TIER_1_COUNCIL` approval, and the current governance context only has `NONE`, the decision will be `NEEDS_APPROVAL`. If the action requires a council approval, the router also verifies that explicit approval IDs are present.
-   `AUTO_EXECUTE_OK`: The action meets all risk and governance requirements and is permitted to execute automatically.

## How Governance and Risk Shape Automation

The router acts as a vital control mechanism, ensuring that "speed" (automation) is only applied when "control" (governance and risk assessment) justifies it.

-   **Risk as a Gate**: Low-risk actions are typically kept manual, as the cost of a false positive in automation might outweigh the benefit. Higher risk situations can unlock automation, provided governance allows it.
-   **Governance as Authorization**: Even in high-risk scenarios, sensitive actions (like tuning a detection threshold globally) require explicit authorization from specific councils. The router enforces these tier-based requirements, ensuring that automation never self-approves privileged operations.
