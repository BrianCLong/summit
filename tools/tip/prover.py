"""Core prover for the Tenant Isolation Prover (TIP)."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Literal, Optional, Sequence, Tuple

from .loader import PolicyDocument


def _ensure_labels(obj: Optional[Dict[str, Any]]) -> Dict[str, str]:
  if not obj:
    return {}
  return {str(k): str(v) for k, v in obj.items()}


@dataclass(frozen=True)
class Namespace:
  name: str
  labels: Dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class Pod:
  name: str
  namespace: str
  labels: Dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class NetworkPolicy:
  name: str
  namespace: str
  pod_selector: Dict[str, Any]
  ingress: List[Dict[str, Any]]
  policy_types: Sequence[str]

  def selects(self, pod: Pod) -> bool:
    selector = self.pod_selector or {}
    match_labels = selector.get("matchLabels", {})
    for key, value in match_labels.items():
      if pod.labels.get(key) != value:
        return False
    expressions = selector.get("matchExpressions", [])
    for expression in expressions:
      if not _evaluate_label_expression(expression, pod.labels):
        return False
    return True


@dataclass(frozen=True)
class Rule:
  api_groups: Sequence[str]
  resources: Sequence[str]
  verbs: Sequence[str]


@dataclass(frozen=True)
class Role:
  name: str
  namespace: Optional[str]
  rules: Sequence[Rule]


@dataclass(frozen=True)
class RoleBinding:
  name: str
  namespace: Optional[str]
  role_ref: Dict[str, Any]
  subjects: Sequence[Dict[str, Any]]


@dataclass(frozen=True)
class ServiceAccount:
  name: str
  namespace: str


@dataclass(frozen=True)
class Proof:
  digest: str
  resources_hashed: Sequence[str]
  policy_count: int
  summary: Dict[str, Any]

  def to_dict(self) -> Dict[str, Any]:
    return {
      "digest": self.digest,
      "resources_hashed": list(self.resources_hashed),
      "policy_count": self.policy_count,
      "summary": self.summary,
    }


@dataclass(frozen=True)
class TipResult:
  status: Literal["passed", "failed"]
  proof: Optional[Proof]
  counterexamples: Sequence[Dict[str, Any]]
  analysis: Dict[str, Any]
  warnings: Sequence[str] = field(default_factory=tuple)

  def to_dict(self) -> Dict[str, Any]:
    payload = {
      "status": self.status,
      "analysis": self.analysis,
      "counterexamples": list(self.counterexamples),
    }
    if self.proof:
      payload["proof"] = self.proof.to_dict()
    if self.warnings:
      payload["warnings"] = list(self.warnings)
    return payload

  def to_json(self, *, indent: int = 2) -> str:
    return json.dumps(self.to_dict(), indent=indent, sort_keys=True)


def _evaluate_label_expression(expression: Dict[str, Any], labels: Dict[str, str]) -> bool:
  key = expression.get("key")
  operator = expression.get("operator")
  values = expression.get("values", [])
  if operator == "In":
    return labels.get(key) in values
  if operator == "NotIn":
    return labels.get(key) not in values
  if operator == "Exists":
    return key in labels
  if operator == "DoesNotExist":
    return key not in labels
  return False


class TenantIsolationProver:
  """Symbolic verifier for Kubernetes tenant isolation."""

  def __init__(self, manifests: Sequence[Dict[str, Any]], policies: Sequence[PolicyDocument]):
    self.manifests = list(manifests)
    self.policies = list(policies)
    self.namespaces: Dict[str, Namespace] = {}
    self.pods: List[Pod] = []
    self.network_policies: List[NetworkPolicy] = []
    self.roles: Dict[Tuple[str, Optional[str]], Role] = {}
    self.role_bindings: List[RoleBinding] = []
    self.service_accounts: Dict[Tuple[str, str], ServiceAccount] = {}
    self.cluster_roles: Dict[str, Role] = {}
    self.cluster_role_bindings: List[RoleBinding] = []
    self._index_manifests()

  # ---------------------------------------------------------------------------
  # Public API
  # ---------------------------------------------------------------------------
  def prove(self) -> TipResult:
    analysis = {
      "tenants": sorted(self.namespaces.keys()),
    }
    network_findings, network_counterexamples = self._analyse_network()
    rbac_findings, rbac_counterexamples = self._analyse_rbac()
    policy_findings = self._summarise_policies()
    analysis["network"] = network_findings
    analysis["rbac"] = rbac_findings
    analysis["opa"] = policy_findings
    counterexamples = network_counterexamples + rbac_counterexamples
    warnings: List[str] = []
    if policy_findings.get("networkFocusedCount", 0) == 0 and self.policies:
      warnings.append("No network isolation Gatekeeper constraints detected")
    if counterexamples:
      return TipResult(
        status="failed",
        proof=None,
        counterexamples=counterexamples,
        analysis=_stable_dict(analysis),
        warnings=tuple(sorted(warnings)),
      )
    proof = self._build_proof(analysis)
    return TipResult(
      status="passed",
      proof=proof,
      counterexamples=(),
      analysis=_stable_dict(analysis),
      warnings=tuple(sorted(warnings)),
    )

  # ---------------------------------------------------------------------------
  # Manifest indexing
  # ---------------------------------------------------------------------------
  def _index_manifests(self) -> None:
    for doc in self.manifests:
      kind = doc.get("kind")
      metadata = doc.get("metadata", {})
      name = metadata.get("name")
      namespace = metadata.get("namespace")
      if not kind or not name:
        continue
      kind = str(kind)
      name = str(name)
      namespace = str(namespace) if namespace else None
      if kind == "Namespace":
        self.namespaces[name] = Namespace(name=name, labels=_ensure_labels(metadata.get("labels")))
      elif kind == "Pod":
        if not namespace:
          continue
        self.pods.append(
          Pod(name=name, namespace=namespace, labels=_ensure_labels(metadata.get("labels")))
        )
      elif kind == "Deployment":
        if not namespace:
          continue
        template = doc.get("spec", {}).get("template", {})
        pod_meta = template.get("metadata", {})
        self.pods.append(
          Pod(name=f"{name}-template", namespace=namespace, labels=_ensure_labels(pod_meta.get("labels")))
        )
      elif kind == "NetworkPolicy":
        if not namespace:
          continue
        spec = doc.get("spec", {})
        policy_types = spec.get("policyTypes") or ["Ingress"]
        ingress = spec.get("ingress", []) or []
        self.network_policies.append(
          NetworkPolicy(
            name=name,
            namespace=namespace,
            pod_selector=spec.get("podSelector", {}) or {},
            ingress=list(ingress),
            policy_types=list(policy_types),
          )
        )
      elif kind in {"Role", "ClusterRole"}:
        rules = [
          Rule(
            api_groups=tuple(rule.get("apiGroups", []) or []),
            resources=tuple(rule.get("resources", []) or []),
            verbs=tuple(rule.get("verbs", []) or []),
          )
          for rule in doc.get("rules", []) or []
        ]
        role = Role(name=name, namespace=namespace if kind == "Role" else None, rules=tuple(rules))
        if kind == "Role":
          self.roles[(name, namespace)] = role
        else:
          self.cluster_roles[name] = role
      elif kind in {"RoleBinding", "ClusterRoleBinding"}:
        subjects = tuple(doc.get("subjects", []) or [])
        role_binding = RoleBinding(
          name=name,
          namespace=namespace if kind == "RoleBinding" else None,
          role_ref=dict(doc.get("roleRef", {})),
          subjects=subjects,
        )
        if kind == "RoleBinding":
          self.role_bindings.append(role_binding)
        else:
          self.cluster_role_bindings.append(role_binding)
      elif kind == "ServiceAccount" and namespace:
        self.service_accounts[(name, namespace)] = ServiceAccount(name=name, namespace=namespace)

  # ---------------------------------------------------------------------------
  # Network analysis
  # ---------------------------------------------------------------------------
  def _analyse_network(self) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    tenants = sorted(self.namespaces.keys())
    pods_by_ns: Dict[str, List[Pod]] = {ns: [] for ns in tenants}
    for pod in self.pods:
      pods_by_ns.setdefault(pod.namespace, []).append(pod)
    for pod_list in pods_by_ns.values():
      pod_list.sort(key=lambda pod: pod.name)

    exposures: List[Dict[str, Any]] = []
    coverage: Dict[str, Dict[str, Any]] = {}

    for namespace, pod_list in pods_by_ns.items():
      policies = [policy for policy in self.network_policies if policy.namespace == namespace]
      coverage[namespace] = {
        "podCount": len(pod_list),
        "policies": sorted(policy.name for policy in policies),
        "isolated": True,
      }
      for pod in pod_list:
        applicable = [policy for policy in policies if policy.selects(pod)]
        if not applicable:
          exposures.append(
            _stable_dict(
              {
                "source": "*",
                "target": f"{namespace}/{pod.name}",
                "vector": "network",
                "reason": "Pod is not selected by any NetworkPolicy",
                "ports": ["any"],
              }
            )
          )
          coverage[namespace]["isolated"] = False
          continue
        for other_namespace in tenants:
          if other_namespace == namespace:
            continue
          allowed, reason, policy_name, ports = self._is_cross_namespace_reachable(
            other_namespace, pod, applicable
          )
          if allowed:
            exposures.append(
              _stable_dict(
                {
                  "source": other_namespace,
                  "target": f"{namespace}/{pod.name}",
                  "vector": "network",
                  "policy": policy_name,
                  "reason": reason,
                  "ports": ports or ["any"],
                }
              )
            )
            coverage[namespace]["isolated"] = False

    exposures.sort(key=lambda item: (item["target"], item.get("source", "")))
    coverage = _stable_dict({ns: coverage[ns] for ns in sorted(coverage.keys())})

    counterexamples: List[Dict[str, Any]] = []
    for exposure in exposures:
      source_ns = exposure.get("source", "*")
      target = exposure["target"]
      ce = _stable_dict(
        {
          "type": "network-port-scan",
          "severity": "critical",
          "description": (
            f"Cross-namespace reachability detected: {source_ns} -> {target} ({exposure['reason']})"
          ),
          "steps": [
            {
              "action": "enumerate-pods",
              "namespace": source_ns,
              "result": "attacker identifies accessible pods",
            },
            {
              "action": "connect",
              "from": source_ns,
              "to": target,
              "ports": exposure.get("ports", ["any"]),
              "rationale": exposure["reason"],
            },
          ],
        }
      )
      counterexamples.append(ce)

    findings = {
      "coverage": coverage,
      "exposures": exposures,
    }
    return _stable_dict(findings), counterexamples

  def _is_cross_namespace_reachable(
    self, source_namespace: str, target_pod: Pod, policies: Sequence[NetworkPolicy]
  ) -> Tuple[bool, str, Optional[str], List[str]]:
    namespace_labels = self.namespaces.get(source_namespace, Namespace(source_namespace, {})).labels
    ports: List[str] = []
    for policy in policies:
      if "Ingress" not in {ptype.capitalize() for ptype in policy.policy_types}:
        continue
      if not policy.ingress:
        continue
      for rule in policy.ingress:
        from_blocks = rule.get("from")
        if not from_blocks:
          return True, "Ingress rule allows all namespaces", policy.name, _extract_ports(rule)
        for block in from_blocks:
          if block.get("namespaceSelector") is not None:
            selector = block["namespaceSelector"]
            if _namespace_selector_matches(selector, source_namespace, namespace_labels):
              return True, "Namespace selector includes attacker namespace", policy.name, _extract_ports(rule)
            if not selector.get("matchLabels") and not selector.get("matchExpressions"):
              return True, "Namespace selector matches all namespaces", policy.name, _extract_ports(rule)
          if block.get("podSelector") and source_namespace == target_pod.namespace:
            continue
          if block.get("ipBlock"):
            return True, "Ingress allows arbitrary IP block", policy.name, _extract_ports(rule)
    return False, "All policies restrict cross-namespace ingress", None, ports

  # ---------------------------------------------------------------------------
  # RBAC analysis
  # ---------------------------------------------------------------------------
  def _analyse_rbac(self) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    issues: List[Dict[str, Any]] = []
    dangerous_bindings: List[Dict[str, Any]] = []

    def record_issue(subject: Dict[str, Any], role: Role, reason: str) -> None:
      namespace = subject.get("namespace", "default")
      name = subject.get("name", "unknown")
      dangerous_bindings.append(
        _stable_dict(
          {
            "serviceAccount": f"{namespace}/{name}",
            "role": role.name,
            "reason": reason,
          }
        )
      )
      issues.append(
        _stable_dict(
          {
            "type": "service-account-hop",
            "severity": "high",
            "description": (
              f"Service account {namespace}/{name} can escalate via cluster role {role.name}: {reason}"
            ),
            "steps": [
              {
                "action": "compromise-service-account",
                "serviceAccount": f"{namespace}/{name}",
                "result": "obtain token",
              },
              {
                "action": "use-cluster-role",
                "clusterRole": role.name,
                "capability": reason,
              },
              {
                "action": "access-cross-tenant",
                "targetNamespaces": sorted(self.namespaces.keys()),
                "impact": "read or modify resources across tenants",
              },
            ],
          }
        )
      )

    for binding in self.cluster_role_bindings:
      role = self.cluster_roles.get(binding.role_ref.get("name"))
      if not role:
        continue
      reason = _role_is_dangerous(role)
      if not reason:
        continue
      for subject in binding.subjects:
        if subject.get("kind") != "ServiceAccount":
          continue
        record_issue(subject, role, reason)

    for binding in self.role_bindings:
      if binding.role_ref.get("kind") != "ClusterRole":
        continue
      role = self.cluster_roles.get(binding.role_ref.get("name"))
      if not role:
        continue
      reason = _role_is_dangerous(role)
      if not reason:
        continue
      for subject in binding.subjects:
        if subject.get("kind") != "ServiceAccount":
          continue
        record_issue(subject, role, reason)

    dangerous_bindings.sort(key=lambda item: item["serviceAccount"])
    findings = {
      "dangerousBindings": dangerous_bindings,
      "serviceAccountCount": len(self.service_accounts),
    }
    return _stable_dict(findings), issues

  # ---------------------------------------------------------------------------
  # Policy summary
  # ---------------------------------------------------------------------------
  def _summarise_policies(self) -> Dict[str, Any]:
    summaries: List[Dict[str, Any]] = []
    network_keywords = {"networkpolicy", "tenant", "isolation", "namespace"}
    network_focused = 0
    for policy in sorted(self.policies, key=lambda doc: (doc.kind, doc.name)):
      body_text = json.dumps(policy.body, sort_keys=True).lower()
      focuses_network = any(keyword in body_text for keyword in network_keywords)
      if focuses_network:
        network_focused += 1
      summaries.append(
        _stable_dict(
          {
            "name": policy.name,
            "kind": policy.kind,
            "path": str(policy.path),
            "networkRelevant": focuses_network,
          }
        )
      )
    return _stable_dict(
      {
        "policies": summaries,
        "total": len(self.policies),
        "networkFocusedCount": network_focused,
      }
    )

  # ---------------------------------------------------------------------------
  # Proof construction
  # ---------------------------------------------------------------------------
  def _build_proof(self, analysis: Dict[str, Any]) -> Proof:
    canonical_resources = [
      _canonicalise_resource(doc) for doc in sorted(self.manifests, key=_resource_sort_key)
    ]
    canonical_policies = [doc.raw for doc in sorted(self.policies, key=lambda d: (d.kind, d.name))]
    digest_payload = {
      "manifests": canonical_resources,
      "policies": canonical_policies,
      "analysis": analysis,
    }
    digest = hashlib.sha256(json.dumps(digest_payload, sort_keys=True).encode("utf-8")).hexdigest()
    summary = {
      "tenants": analysis.get("tenants", []),
      "network": {
        "isolatedTenants": [
          tenant
          for tenant, data in analysis.get("network", {}).get("coverage", {}).items()
          if data.get("isolated")
        ],
      },
      "rbac": {
        "dangerousBindings": analysis.get("rbac", {}).get("dangerousBindings", []),
      },
      "opa": {
        "networkFocusedCount": analysis.get("opa", {}).get("networkFocusedCount", 0),
      },
    }
    return Proof(
      digest=digest,
      resources_hashed=[json.dumps(item, sort_keys=True) for item in canonical_resources],
      policy_count=len(canonical_policies),
      summary=_stable_dict(summary),
    )


def _resource_sort_key(resource: Dict[str, Any]) -> Tuple[str, str, str]:
  metadata = resource.get("metadata", {})
  return (
    str(resource.get("kind", "")),
    str(metadata.get("namespace") or ""),
    str(metadata.get("name") or ""),
  )


def _canonicalise_resource(resource: Dict[str, Any]) -> Dict[str, Any]:
  metadata = resource.get("metadata", {})
  canonical = {
    "apiVersion": resource.get("apiVersion"),
    "kind": resource.get("kind"),
    "metadata": {
      "name": metadata.get("name"),
      "namespace": metadata.get("namespace"),
      "labels": metadata.get("labels", {}),
    },
  }
  spec = resource.get("spec")
  if spec is not None:
    canonical["spec"] = spec
  return _stable_dict(canonical)


def _namespace_selector_matches(selector: Dict[str, Any], namespace: str, labels: Dict[str, str]) -> bool:
  match_labels = selector.get("matchLabels") or {}
  if match_labels:
    for key, value in match_labels.items():
      if labels.get(key) != value:
        return False
  expressions = selector.get("matchExpressions", [])
  for expression in expressions:
    if not _evaluate_label_expression(expression, labels):
      return False
  if not match_labels and not expressions:
    return True
  return bool(match_labels or expressions)


def _extract_ports(rule: Dict[str, Any]) -> List[str]:
  ports: List[str] = []
  for port in rule.get("ports", []) or []:
    value = port.get("port")
    if value is None:
      ports.append("any")
    else:
      ports.append(str(value))
  return sorted(set(ports))


def _role_is_dangerous(role: Role) -> Optional[str]:
  for rule in role.rules:
    verbs = {verb.lower() for verb in rule.verbs}
    resources = {resource.lower() for resource in rule.resources}
    if "*" in verbs or "*" in resources:
      return "wildcard permissions"
    if {"create", "update", "patch", "delete", "*"} & verbs and (
      {"secrets", "roles", "clusterroles", "serviceaccounts"} & resources
    ):
      return "service account can modify sensitive RBAC objects"
    if {"get", "list", "watch", "*"} & verbs and "secrets" in resources:
      return "service account can read secrets across namespaces"
    if "impersonate" in verbs:
      return "service account can impersonate other identities"
  return None


def _stable_dict(data: Dict[str, Any]) -> Dict[str, Any]:
  if isinstance(data, dict):
    return {key: _stable_dict(value) for key, value in sorted(data.items(), key=lambda item: item[0])}
  if isinstance(data, list):
    return [_stable_dict(value) for value in data]
  if isinstance(data, tuple):
    return tuple(_stable_dict(value) for value in data)
  return data
