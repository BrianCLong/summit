from services.graphrag_api.middleware.budget_enforcer import BudgetEnforcer
from services.graphrag_api.models.reasoning_budget import ReasoningBudget

def test_enforce_defaults():
    enforcer = BudgetEnforcer()
    budget = ReasoningBudget()
    # Default policy has max_allowed_hops=5. Default budget has 3. So 3 should remain.
    context = enforcer.enforce("unknown_tenant", budget)
    assert context.budget.explore.max_hops == 3

def test_enforce_caps():
    enforcer = BudgetEnforcer(tenant_policies={
        "strict": {"max_allowed_hops": 2}
    })
    budget = ReasoningBudget()
    budget.explore.max_hops = 10

    context = enforcer.enforce("strict", budget)
    assert context.budget.explore.max_hops == 2
