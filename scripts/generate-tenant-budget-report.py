#!/usr/bin/env python3
"""
MC Platform Tenant Budget Report Generator
Creates daily budget tracking reports for evidence bundle
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


class TenantBudgetReporter:
    def __init__(self, prometheus_url: str, tenants: list[str]):
        self.prometheus_url = prometheus_url.rstrip("/")
        self.tenants = tenants
        self.session = requests.Session()

    def query_prometheus(self, query: str, time_range: str = "1d") -> list[dict[str, Any]]:
        """Query Prometheus for metrics data"""
        try:
            params = {"query": query, "time": datetime.utcnow().isoformat() + "Z"}

            response = self.session.get(
                f"{self.prometheus_url}/api/v1/query", params=params, timeout=30
            )
            response.raise_for_status()

            data = response.json()
            if data["status"] != "success":
                print(
                    f"⚠️ Prometheus query failed: {data.get('error', 'unknown error')}",
                    file=sys.stderr,
                )
                return []

            return data["data"]["result"]

        except Exception as e:
            print(f"⚠️ Error querying Prometheus: {e}", file=sys.stderr)
            return []

    def get_tenant_budget_status(self, tenant: str) -> dict[str, Any]:
        """Get comprehensive budget status for a tenant"""

        # Current cost metrics
        daily_cost = self.query_prometheus(f'mc_tenant_cost_daily_usd{{tenant="{tenant}"}}')
        budget_limit = self.query_prometheus(f'mc_tenant_budget_limit_usd{{tenant="{tenant}"}}')
        monthly_budget = self.query_prometheus(f'mc_tenant_budget_monthly_usd{{tenant="{tenant}"}}')

        # Calculated metrics
        utilization = self.query_prometheus(
            f'mc:tenant_budget_utilization:rate5m{{tenant="{tenant}"}}'
        )
        burn_rate = self.query_prometheus(f'mc:tenant_budget_burn_rate:1h{{tenant="{tenant}"}}')
        remaining = self.query_prometheus(
            f'mc:tenant_budget_remaining:current{{tenant="{tenant}"}}'
        )

        # Extract values with defaults
        daily_cost_val = float(daily_cost[0]["value"][1]) if daily_cost else 0.0
        budget_limit_val = float(budget_limit[0]["value"][1]) if budget_limit else 100.0
        monthly_budget_val = float(monthly_budget[0]["value"][1]) if monthly_budget else 3000.0
        utilization_val = float(utilization[0]["value"][1]) if utilization else 0.0
        burn_rate_val = float(burn_rate[0]["value"][1]) if burn_rate else 0.0
        remaining_val = float(remaining[0]["value"][1]) if remaining else budget_limit_val

        # Calculate status
        status = "healthy"
        if utilization_val >= 90:
            status = "critical"
        elif utilization_val >= 80:
            status = "warning"

        # Calculate days remaining
        days_remaining = remaining_val / (daily_cost_val + 0.01)  # Avoid division by zero

        return {
            "tenant": tenant,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "daily_cost": daily_cost_val,
            "budget_limit": budget_limit_val,
            "monthly_budget": monthly_budget_val,
            "utilization_percent": utilization_val,
            "burn_rate_multiplier": burn_rate_val,
            "remaining_budget": remaining_val,
            "days_remaining": min(days_remaining, 999),  # Cap at 999 days
            "status": status,
            "alerts": self.get_budget_alerts(tenant, utilization_val, burn_rate_val),
        }

    def get_budget_alerts(self, tenant: str, utilization: float, burn_rate: float) -> list[str]:
        """Generate budget alerts for tenant"""
        alerts = []

        if utilization >= 90:
            alerts.append(
                f"CRITICAL: Budget utilization at {utilization:.1f}% - immediate action required"
            )
        elif utilization >= 80:
            alerts.append(f"WARNING: Budget utilization at {utilization:.1f}% - monitor closely")

        if burn_rate > 1.2:
            alerts.append(
                f"WARNING: Burn rate {burn_rate:.1f}x above projected - review usage patterns"
            )

        if burn_rate > 1.5:
            alerts.append(
                f"CRITICAL: Burn rate {burn_rate:.1f}x above projected - budget overrun likely"
            )

        return alerts

    def generate_comprehensive_report(self) -> dict[str, Any]:
        """Generate comprehensive budget report for all tenants"""

        print("📊 Generating tenant budget report...")
        tenant_reports = []

        for tenant in self.tenants:
            print(f"  Processing {tenant}...")
            budget_status = self.get_tenant_budget_status(tenant)
            tenant_reports.append(budget_status)

        # Calculate aggregate stats
        total_cost = sum(t["daily_cost"] for t in tenant_reports)
        total_budget = sum(t["budget_limit"] for t in tenant_reports)
        avg_utilization = (
            sum(t["utilization_percent"] for t in tenant_reports) / len(tenant_reports)
            if tenant_reports
            else 0
        )

        critical_tenants = [t for t in tenant_reports if t["status"] == "critical"]
        warning_tenants = [t for t in tenant_reports if t["status"] == "warning"]

        return {
            "report_metadata": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "platform_version": "v0.3.3-mc",
                "report_type": "tenant_budget_daily",
                "tenants_analyzed": len(tenant_reports),
                "prometheus_source": self.prometheus_url,
            },
            "aggregate_summary": {
                "total_daily_cost": total_cost,
                "total_daily_budget": total_budget,
                "overall_utilization_percent": (
                    (total_cost / total_budget * 100) if total_budget > 0 else 0
                ),
                "average_tenant_utilization": avg_utilization,
                "critical_tenants_count": len(critical_tenants),
                "warning_tenants_count": len(warning_tenants),
                "healthy_tenants_count": len(tenant_reports)
                - len(critical_tenants)
                - len(warning_tenants),
            },
            "tenant_details": tenant_reports,
            "action_items": self.generate_action_items(tenant_reports),
            "recommendations": self.generate_recommendations(tenant_reports),
        }

    def generate_action_items(self, tenant_reports: list[dict[str, Any]]) -> list[str]:
        """Generate action items based on tenant budget status"""
        actions = []

        critical_tenants = [t for t in tenant_reports if t["status"] == "critical"]
        for tenant in critical_tenants:
            actions.append(
                f"URGENT: Review {tenant['tenant']} usage - {tenant['utilization_percent']:.1f}% budget utilization"
            )

        high_burn_rate = [t for t in tenant_reports if t["burn_rate_multiplier"] > 1.3]
        for tenant in high_burn_rate:
            actions.append(
                f"REVIEW: {tenant['tenant']} burn rate {tenant['burn_rate_multiplier']:.1f}x - optimize resources"
            )

        low_remaining = [t for t in tenant_reports if t["days_remaining"] < 7]
        for tenant in low_remaining:
            actions.append(
                f"PLAN: {tenant['tenant']} budget exhaustion in {tenant['days_remaining']:.1f} days"
            )

        return actions

    def generate_recommendations(self, tenant_reports: list[dict[str, Any]]) -> list[str]:
        """Generate optimization recommendations"""
        recommendations = []

        avg_utilization = (
            sum(t["utilization_percent"] for t in tenant_reports) / len(tenant_reports)
            if tenant_reports
            else 0
        )

        if avg_utilization > 70:
            recommendations.append(
                "Consider implementing cost optimization strategies across high-utilization tenants"
            )

        high_variance = (
            max(t["utilization_percent"] for t in tenant_reports)
            - min(t["utilization_percent"] for t in tenant_reports)
            if tenant_reports
            else 0
        )
        if high_variance > 50:
            recommendations.append(
                "Large budget utilization variance detected - review resource allocation policies"
            )

        over_budget = len([t for t in tenant_reports if t["utilization_percent"] > 100])
        if over_budget > 0:
            recommendations.append(
                f"{over_budget} tenants over budget - implement cost controls and alerts"
            )

        return recommendations


def main():
    parser = argparse.ArgumentParser(description="MC Platform Tenant Budget Reporter")
    parser.add_argument("--prometheus-url", default="http://prometheus:9090", help="Prometheus URL")
    parser.add_argument(
        "--tenants",
        default="TENANT_001,TENANT_002,TENANT_003,TENANT_004,TENANT_005",
        help="Comma-separated tenant list",
    )
    parser.add_argument(
        "--output",
        default="evidence/v0.3.3/budgets/tenant-budget-report.json",
        help="Output file path",
    )
    parser.add_argument(
        "--format", choices=["json", "summary"], default="json", help="Output format"
    )

    args = parser.parse_args()

    # Parse tenant list
    tenants = [t.strip() for t in args.tenants.split(",") if t.strip()]

    # Initialize reporter
    reporter = TenantBudgetReporter(args.prometheus_url, tenants)

    # Generate report
    try:
        report = reporter.generate_comprehensive_report()

        # Ensure output directory exists
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)

        # Save report
        if args.format == "json":
            with open(args.output, "w") as f:
                json.dump(report, f, indent=2)
            print(f"✅ Budget report saved: {args.output}")
        else:
            # Print summary
            print("\n📊 TENANT BUDGET SUMMARY")
            print("========================")
            print(f"Total tenants: {report['aggregate_summary']['tenants_analyzed']}")
            print(f"Total daily cost: ${report['aggregate_summary']['total_daily_cost']:.2f}")
            print(
                f"Overall utilization: {report['aggregate_summary']['overall_utilization_percent']:.1f}%"
            )
            print(f"Critical tenants: {report['aggregate_summary']['critical_tenants_count']}")
            print(f"Warning tenants: {report['aggregate_summary']['warning_tenants_count']}")

            if report["action_items"]:
                print("\n🚨 ACTION ITEMS:")
                for action in report["action_items"]:
                    print(f"  • {action}")

            if report["recommendations"]:
                print("\n💡 RECOMMENDATIONS:")
                for rec in report["recommendations"]:
                    print(f"  • {rec}")

    except Exception as e:
        print(f"❌ Error generating budget report: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
