# Defense CRM Dependent Claims (v1)

This document contains additional dependent claims for the Defense CRM family, focusing on formal verification, policy simulation, and federated defense.

## Cluster 1: Formal verification / model checking (C151–C160)

C151. The medium of claim C1, wherein the instructions cause the system to verify a replay manifest by checking presence and consistency of at least a graph snapshot hash, a policy bundle hash, and version identifiers for tools or models used to generate a defense action.
C152. The medium of claim C151, wherein the instructions cause the system to compute a verification proof artifact indicating that the replay manifest satisfies a set of validation rules and to store the verification proof artifact in the audit log.
C153. The medium of claim C1, wherein the instructions cause the system to perform a satisfiability check over governance policies and defense action schemas to determine whether at least one permitted defense action exists under the policies.
C154. The medium of claim C153, wherein the instructions cause the system to enter a safe mode that denies external publishing defense actions when the satisfiability check fails.
C155. The medium of claim C1, wherein the instructions cause the system to check that modify decisions preserve required attribution fields and uncertainty fields for each defense action type.
C156. The medium of claim C155, wherein the instructions cause the system to generate a counterexample artifact when a modify decision would remove a required field and to record the counterexample artifact in the audit log.
C157. The medium of claim C1, wherein the instructions cause the system to verify that a digitally signed defense action is bound to a specific graph snapshot hash and policy bundle hash.
C158. The medium of claim C1, wherein the instructions cause the system to perform a policy constraint compliance check that confirms each executed defense action satisfies all applicable hard constraints derived from governance policies.
C159. The medium of claim C158, wherein the instructions cause the system to deny execution when the policy constraint compliance check produces an unsatisfied constraint and to record an unsatisfied-constraint explanation in the audit log.
C160. The medium of claim C1, wherein the instructions cause the system to validate determinism by re-running at least a portion of simulation or policy evaluation using the replay manifest and confirming byte-identical outputs.

## Cluster 2: Policy simulation (“what-if” governance changes) (C161–C170)

C161. The medium of claim C1, wherein the instructions cause the system to execute a policy what-if simulation by evaluating a same set of candidate defense actions under at least two different policy bundle hashes.
C162. The medium of claim C161, wherein the instructions cause the system to generate a policy delta report comprising differences in allow, deny, and modify decisions between the at least two different policy bundle hashes.
C163. The medium of claim C162, wherein the policy delta report further comprises a differential risk delta for at least one metric comprising policy risk, legal risk, or operational risk.
C164. The medium of claim C1, wherein the instructions cause the system to deny enabling a new policy bundle hash for production execution when the policy delta report indicates an increase in external publishing permissions above a threshold absent human approval.
C165. The medium of claim C1, wherein the instructions cause the system to simulate effects of a policy change on ranking outputs by re-ranking candidate defense actions under each policy bundle hash.
C166. The medium of claim C165, wherein the instructions cause the system to identify defense action types that transition from permitted to denied or from denied to permitted and to record the transitions in the audit log.
C167. The medium of claim C1, wherein the instructions cause the system to require that policy delta reports reference replay manifests and snapshot hashes used to generate the reports.
C168. The medium of claim C1, wherein the instructions cause the system to gate rollout of a new policy bundle hash using staged rollout criteria and to revert to a prior policy bundle hash upon detecting a degradation in trust impact metrics.
C169. The medium of claim C1, wherein the instructions cause the system to generate recommended policy edits that reduce conflicts or gaps while maintaining deny-by-default for external publishing actions.
C170. The medium of claim C1, wherein the instructions cause the system to store policy what-if simulation inputs and outputs as redacted artifacts excluding never-log fields.

## Cluster 3: Cross-org federated defense (privacy-preserving sharing across tenants) (C171–C180)

C171. The medium of claim C1, wherein the instructions cause the system to operate in a multi-tenant configuration comprising a plurality of tenant boundaries and to maintain tenant-isolated narrative operating graphs.
C172. The medium of claim C171, wherein the instructions cause the system to compute tenant-local technique indicator aggregates comprising counts or rates of manipulation technique labels without exporting raw artifacts.
C173. The medium of claim C172, wherein the instructions cause the system to share, across tenant boundaries, only federated aggregates that satisfy a minimum thresholding rule that prevents disclosure of individual-level data.
C174. The medium of claim C171, wherein the instructions cause the system to apply a privacy budget to federated aggregates and to restrict additional sharing when the privacy budget is exceeded.
C175. The medium of claim C171, wherein the instructions cause the system to perform secure aggregation such that a coordinator cannot access individual tenant contributions to an aggregate.
C176. The medium of claim C171, wherein the instructions cause the system to distribute a robustness regression alert across tenants when robustness scores degrade across successive bundle versions, without disclosing tenant-specific raw data.
C177. The medium of claim C171, wherein the instructions cause the system to maintain tenant-specific governance policies and to deny application of a federated recommendation when inconsistent with a tenant’s policies.
C178. The medium of claim C171, wherein the instructions cause the system to record federated aggregate identifiers, privacy parameters, and recipient tenant identifiers in an audit log.
C179. The medium of claim C171, wherein the instructions cause the system to restrict federated sharing to technique indicators and robustness regressions and to prohibit sharing of message content templates across tenants absent explicit approval.
C180. The medium of claim C171, wherein the instructions cause the system to generate a federated defense report summarizing aggregated technique trends and recommended monitoring-only actions for each tenant.
