# Defense Simulation Apparatus Dependent Claims (v1)

This document contains additional dependent claims for the Defense Simulation Apparatus family, focusing on formal verification, policy simulation, and federated defense.

## Cluster 1: Formal verification / model checking for simulation outputs (S151–S160)

S151. The apparatus of claim S1, wherein the apparatus verifies a replay manifest by checking presence and consistency of at least a snapshot hash, a policy bundle hash, and transition function version identifiers used in counterfactual simulation.
S152. The apparatus of claim S151, wherein the apparatus generates a verification proof artifact indicating that ranked outputs are reproducible under the replay manifest and records the proof artifact in an audit log.
S153. The apparatus of claim S1, wherein the apparatus performs a satisfiability check over governance policies and candidate defense action schemas prior to producing ranked outputs.
S154. The apparatus of claim S153, wherein the apparatus enters a safe mode that excludes external publishing actions from ranking when the satisfiability check fails.
S155. The apparatus of claim S1, wherein the apparatus checks that modify decisions preserve required attribution and uncertainty fields and generates a counterexample artifact when a modified action violates a required-field constraint.
S156. The apparatus of claim S155, wherein the apparatus records the counterexample artifact and a policy bundle hash in an append-only audit log.
S157. The apparatus of claim S1, wherein the apparatus performs a policy constraint compliance check confirming that each output permitted defense action satisfies all applicable hard constraints derived from governance policies.
S158. The apparatus of claim S157, wherein the apparatus denies producing an output permitted defense action when the compliance check yields an unsatisfied constraint and records an unsatisfied-constraint explanation.
S159. The apparatus of claim S1, wherein the apparatus validates determinism by re-running counterfactual simulations using canonical ordering and fixed seeds specified in a replay manifest and confirming byte-identical ranked outputs.
S160. The apparatus of claim S1, wherein the apparatus digitally signs a replay manifest or proof artifact and stores a signature identifier linked to snapshot hash and policy bundle hash.

## Cluster 2: Policy simulation (“what-if” governance changes) in ranking (S161–S170)

S161. The apparatus of claim S1, wherein the apparatus executes a policy what-if simulation by evaluating a same set of candidate defense actions under at least two different policy bundle hashes.
S162. The apparatus of claim S161, wherein the apparatus generates a policy delta report comprising differences in allow, deny, and modify decisions between the at least two different policy bundle hashes.
S163. The apparatus of claim S162, wherein the policy delta report comprises differential risk deltas for at least one metric comprising policy risk, legal risk, or trust impact.
S164. The apparatus of claim S1, wherein the apparatus denies enabling production ranking under a new policy bundle hash when the policy delta report indicates an increase in externally publishable actions above a threshold absent approval.
S165. The apparatus of claim S1, wherein the apparatus re-ranks candidate defense actions under each policy bundle hash and outputs a ranking delta summary.
S166. The apparatus of claim S165, wherein the apparatus identifies defense action types that change permission status between policy bundles and records the changes in an audit log linked to the policy bundle hashes.
S167. The apparatus of claim S1, wherein the apparatus includes in a replay manifest the policy bundle hashes compared in the policy what-if simulation and the snapshot hash used for the comparison.
S168. The apparatus of claim S1, wherein the apparatus gates rollout of a new policy bundle hash via staged rollout criteria and reverts to a prior policy bundle hash when validation metrics degrade.
S169. The apparatus of claim S1, wherein the apparatus computes a policy coverage metric and excludes from ranking any candidate defense action whose required fields are not governed by at least one applicable rule.
S170. The apparatus of claim S1, wherein the apparatus stores policy delta reports as redacted artifacts excluding never-log fields.

## Cluster 3: Cross-org federated defense in simulation (S171–S180)

S171. The apparatus of claim S1, wherein the apparatus operates in a multi-tenant configuration and maintains tenant-isolated simulation inputs comprising tenant-specific snapshots and tenant-specific governance policies.
S172. The apparatus of claim S171, wherein the apparatus receives federated aggregates comprising technique indicator rates computed across tenants without receiving raw artifacts.
S173. The apparatus of claim S172, wherein the apparatus conditions transition function parameters on the federated aggregates to adjust simulated adversarial response likelihood.
S174. The apparatus of claim S171, wherein the apparatus applies thresholding rules that exclude federated aggregates that do not satisfy minimum aggregation criteria.
S175. Broadly, the apparatus of claim S171, wherein the apparatus applies a privacy budget to the use of federated aggregates and restricts further use when the privacy budget is exceeded.
S176. The apparatus of claim S171, wherein the apparatus performs secure aggregation such that a coordinator cannot access individual tenant contributions to a federated aggregate.
S177. The apparatus of claim S171, wherein the apparatus outputs tenant-specific rankings that incorporate federated robustness regression alerts while respecting tenant-specific governance constraints.
S178. The apparatus of claim S171, wherein the apparatus denies applying a federated recommendation when inconsistent with a tenant’s governance policies and records the denial reason.
S179. The apparatus of claim S171, wherein the replay manifest includes identifiers of federated aggregates used and privacy parameters associated with the federated aggregates.
S180. The apparatus of claim S171, wherein the apparatus records federated aggregate usage events in an audit log without recording raw tenant contributions.
