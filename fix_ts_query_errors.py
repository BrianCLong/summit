import os
import re

# List of files identified in the error log
files_with_errors = [
    "server/src/routes/case-workflow.ts",
    "server/src/routes/supply-chain.ts",
    "server/src/routes/provenance-beta.ts",
    "server/src/routes/policies/policy-management.ts",
    "server/src/routes/sandbox/sandbox-admin.ts",
    "server/src/routes/scim.ts",
    "server/src/routes/v4/zero-trust.ts",
    "server/src/maestro/store/orchestrator-store.ts",
    "server/src/routes/admin/users.ts",
    "server/src/routes/experimentation.ts",
    "server/src/routes/trust-center-api.ts",
    "server/src/routes/v4/ai-governance.ts",
    "server/src/routes/governance.ts",
    "server/src/routes/maestro_routes.ts",
    "server/src/search-index/SearchIndexService.ts",
    "server/src/conductor/edge/conflict-ui-controller.ts",
    "server/src/routes/admin/roles.ts",
    "server/src/routes/cases.ts",
    "server/src/routes/mastery.ts",
    "server/src/routes/sso.ts",
    "server/src/routes/support-center.ts",
    "server/src/services/brand-packs/brand-pack.routes.ts",
    "server/src/services/HighRiskOperationService.ts",
    "server/src/api/featureFlags.ts",
    "server/src/conductor/mcp/orchestrator-api.ts",
    "server/src/cross-border/router.ts",
    "server/src/llm/providers/nvidia-nim.ts",
    "server/src/provenance/fcr-ledger.ts",
    "server/src/rag/intent_compiler.ts",
    "server/src/routes/analytics.ts",
    "server/src/routes/explainability-explorer.ts",
    "server/src/routes/narrative-routes.ts",
    "server/src/routes/ontology.ts",
    "server/src/routes/soar.ts",
    "server/src/routes/summitsight.ts",
    "server/src/routes/tenants/usage.ts",
    "server/src/routes/v4/compliance.ts",
    "server/src/services/ToolbusService.ts",
    "server/src/analytics/cohorts/CohortController.ts",
    "server/src/analytics/experiments/ExperimentController.ts",
    "server/src/billing/BillingJobService.ts",
    "server/src/capability-fabric/firewall.ts",
    "server/src/controllers/OpaController.ts",
    "server/src/maestro/playbooks/signing.ts",
    "server/src/routes/approvals.ts",
    "server/src/routes/incidents/tickets.ts",
    "server/src/routes/onboarding.ts",
    "server/src/routes/stream.ts",
    "server/src/security/vulnerability-dashboard-api.ts",
    "server/src/analytics/funnels/FunnelController.ts",
    "server/src/app.ts",
    "server/src/autonomous/ChangeReviewAgent.ts",
    "server/src/billing/sink.ts",
    "server/src/cases/comments/CommentService.ts",
    "server/src/chaos/ChaosController.ts",
    "server/src/config.ts",
    "server/src/config/logger.ts",
    "server/src/connectors/implementations/cti-feed.ts",
    "server/src/connectors/implementations/github.ts",
    "server/src/connectors/implementations/http-json.ts",
    "server/src/connectors/implementations/jdbc-placeholder.ts",
    "server/src/connectors/implementations/kafka.ts",
    "server/src/connectors/implementations/rss.ts",
    "server/src/connectors/implementations/slack.ts",
    "server/src/data-residency/residency-service.ts",
    "server/src/graphql/resolvers/cases.ts",
    "server/src/llm/index.ts",
    "server/src/llm/prompts/registry.ts",
    "server/src/llm/safety.ts",
    "server/src/maestro/engine.ts",
    "server/src/maestro/routing/router-decision-api.ts",
    "server/src/middleware/advanced-query-security.ts",
    "server/src/orchestrator/PostgresStore.ts",
    "server/src/routes/exports.ts",
    "server/src/routes/graphAnalysis.ts",
    "server/src/routes/i18n.ts",
    "server/src/routes/ingestion.ts",
    "server/src/routes/masint.ts",
    "server/src/routes/ml_review.ts",
    "server/src/routes/predictive.ts",
    "server/src/routes/psyops.ts",
    "server/src/routes/tenants/billing.ts",
    "server/src/routes/xai.ts",
    "server/src/routes/zero_day.ts",
    "server/src/services/AdaptivePolicyService.ts",
    "server/src/services/fcr/schema-validator.ts",
    "server/src/services/GraphStore.ts",
    "server/src/shared/logging/index.ts",
    "server/src/siem/SIEMPlatform.ts"
]

def fix_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        # Pattern 1: req.query.param -> String(req.query.param) or (req.query.param as string)
        # We'll use String() wrapper which is safer for undefined

        # Regex to find usages like: const id = req.query.id;
        # and replace with: const id = String(req.query.id);

        # This is a heuristic. We'll look for direct assignments where type mismatch occurs.
        # Often it is like: function(req.query.id) where function expects string.
        # Or: const x: string = req.query.id;

        # Strategy: Search for  and wrap it in  if it's not already.
        # But we must be careful not to break arrays if they are expected.
        # The error log says "Argument of type 'string | string[]' is not assignable to parameter of type 'string'".
        # So we want to force it to string.

        # Let's replace usages of  with
        # BUT only if it is likely being used as a string.
        # A safer generic fix for this specific TS error is to cast it:
        # However,  might lie if it is indeed an array.  converts array to comma-sep string which is usually fine or .

        # Let's try a regex replace for function arguments and variable assignments.

        fixed_content = content

        # Regex for: req.query.someProp
        # We want to match
        # And replace it with
        # But we need to avoid double wrapping.

        def replacement(match):
            full_match = match.group(0)
            # Check if already wrapped in String() or as string
            # This check is hard with regex alone on the full content context.
            return f"String({full_match})"

        # Simple approach: Identify the lines from the error log?
        # No, we don't have line numbers easily available in this script without parsing the log file again.
        # Let's do a safe global replace of  to
        # ONLY in places where it looks like it's being passed as an arg or assigned.

        # Actually,  properties are .
        # The error is specifically  not assignable to .

        # Pattern:
        # We will iterate through all matches.

        # Heuristic:
        # If we see , replace with
        # This is the standard fix for "I know this is a string".

        # Let's try to be smarter.
        # If the file imports express Request, we can assume it's that.

        # Replace  with
        # But handle existing casts?

        new_content = re.sub(r'req\.query\.(\w+)', r'(req.query.\1 as string)', content)

        # Clean up potential double casts if re-run or existing code:  ->
        new_content = new_content.replace(' as string) as string)', ' as string)')

        if new_content != content:
            print(f"Fixing {filepath}")
            with open(filepath, 'w') as f:
                f.write(new_content)

    except FileNotFoundError:
        print(f"File not found: {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    for fp in files_with_errors:
        fix_file(fp)
