# Research vs. Production Boundary Contract

## 1. Guiding Principle: "Do No Harm"

The Research Track is fundamentally isolated from production systems to ensure that experimental work cannot impact operational stability, security, or compliance guarantees. All research activities must adhere to the principle of "Do No Harm" to the production environment, its data, and its users.

## 2. What Research MAY Do

The Research Track is authorized to:

*   **Explore novel concepts** in isolated, non-production environments.
*   **Develop proofs-of-concept** using simulated or anonymized data.
*   **Produce research artifacts** such as whitepapers, simulation results, and theoretical models.
*   **Collaborate with approved external partners** within the guidelines of the `COLLABORATION.md` document.
*   **Propose ideas for graduation**, subject to the strict criteria outlined in `GRADUATION_RULES.md`.

## 3. What Research MAY NEVER Do

The Research Track is strictly prohibited from:

*   **Accessing production data** unless it has been fully anonymized and approved by the appropriate data governance body.
*   **Deploying code or services** to any production or pre-production environment.
*   **Using shared credentials, APIs, or infrastructure** that are part of the production stack.
*   **Making any changes that could affect production systems**, including but not limited to, modifying shared databases, altering network configurations, or introducing new dependencies into the main codebase.
*   **Engaging in any activity that could compromise the security, privacy, or integrity** of the production environment.

## 4. Isolation Guarantees

To enforce these boundaries, the following technical and procedural controls are in place:

*   **Separate Code Repositories:** All research projects must be maintained in separate, clearly designated research repositories or branches that are not merged into the main production codebase.
*   **No Shared Credentials:** Research environments will have their own unique set of credentials, with no access to production secrets or keys.
*   **No Shared Automation:** CI/CD pipelines and other automation used for production are not to be used for research projects.
*   **Distinct Namespaces and Environments:** Research activities will be conducted in dedicated cloud namespaces or accounts that are logically and physically separated from production.
*   **Regular Audits:** The boundaries and isolation guarantees will be subject to periodic audits to ensure compliance.
