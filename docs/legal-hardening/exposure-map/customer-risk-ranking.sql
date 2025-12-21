-- Customer Risk Ranking Query
-- This query ranks customers/tenants based on "Plaintiff Attractiveness"
-- Factors:
-- 1. Jurisdiction (Litigious states like IL, CA, TX score higher)
-- 2. Data Volume (Number of users/records)
-- 3. Sensitive Data Usage (Biometrics, PII)
-- 4. Contract Type (Consumer/Clickwrap is riskier for Class Actions than Negotiated Enterprise)

WITH TenantRisk AS (
    SELECT
        t.id AS tenant_id,
        t.name AS tenant_name,
        -- Jurisdiction Risk
        CASE
            WHEN t.jurisdiction_state = 'IL' THEN 10 -- BIPA
            WHEN t.jurisdiction_state = 'CA' THEN 8  -- CCPA/CPRA
            WHEN t.jurisdiction_state = 'TX' THEN 7  -- CUBI
            WHEN t.region = 'EU' THEN 9              -- GDPR
            ELSE 3
        END AS jurisdiction_score,

        -- Data Volume Risk (Logarithmic scale assumption)
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count,

        -- Contract Risk
        CASE
            WHEN t.contract_type = 'CLICKWRAP' THEN 8 -- Class Action prone
            WHEN t.contract_type = 'ENTERPRISE_NEGOTIATED' THEN 4 -- Usually has caps/waivers
            ELSE 5
        END AS contract_score

        -- Note: Feature usage (Biometrics) would ideally be queried from a 'features_enabled' table
        -- JOIN features f ON f.tenant_id = t.id ...
)
SELECT
    tenant_name,
    jurisdiction_score,
    user_count,
    contract_score,
    -- Weighted Risk Score Formula
    (jurisdiction_score * 2) + (contract_score * 1.5) + (LOG(GREATEST(user_count, 1)) * 2) AS total_risk_score
FROM
    TenantRisk
ORDER BY
    total_risk_score DESC;
