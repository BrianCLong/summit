from dataclasses import dataclass
from typing import Literal, Optional, Dict, Any
import os

Tier = Literal["REFLEX", "STRATEGY"]
Risk = Literal["low", "medium", "high"]

@dataclass(frozen=True)
class RouteDecision:
  route_name: str
  tier: Tier
  risk: Risk
  requires_verification: bool
  verifier_id: Optional[str] = None

class RouterError(Exception):
    pass

def decide(route_name: str, policy: Dict[str, Any]) -> RouteDecision:
    if os.environ.get("TRUST_ROUTER_ENABLED", "0") != "1":
        # Feature flag off - safe fallback
        return RouteDecision(
            route_name=route_name,
            tier="REFLEX", # Default to safer tier? or just bypass.
            # If we bypass, we might want to return a permissive object or None.
            # But the return type is RouteDecision.
            # Let's return a "low risk" decision that requires no verification.
            risk="low",
            requires_verification=False
        )

    # Find route in policy
    routes = policy.get("routes", [])
    route = next((r for r in routes if r["name"] == route_name), None)

    if not route:
        # Deny by default if route not found
        raise RouterError(f"Route '{route_name}' not defined in policy")

    tier = route["tier"]
    risk = route["risk"]
    requires_verification = route["requires_verification"]

    # Deny by default: high risk must have verification
    if risk == "high" and not requires_verification:
        raise RouterError(f"High risk route '{route_name}' must require verification")

    return RouteDecision(
        route_name=route_name,
        tier=tier,
        risk=risk,
        requires_verification=requires_verification
    )
